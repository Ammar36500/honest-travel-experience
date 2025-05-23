from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.db import connection, models # Import models
from django.core.cache import cache
import uuid
import random
import re
import logging

try:
    from .models import Destination, Review, Country
except ImportError:
    logging.warning("Could not import models directly. Database functions might rely on correct model paths.")
    # Define dummy classes if models cannot be imported, to avoid NameErrors
    # This is NOT ideal for production but helps during development/debugging
    class Destination: pass
    class Review: pass
    class Country: pass

logger = logging.getLogger(__name__)

# ==============================================================================
# Chatbot Personality Class
# ==============================================================================
class TravelAssistantPersonality:
    """Defines the personality and conversational style of the travel assistant"""
    def __init__(self):
        """Initializes personality settings and phrase lists."""
        self.enthusiasm_level = 0.8  # 0-1 scale
        self.formality_level = 0.4   # 0-1 scale

        # Expression variations for different scenarios
        self.greetings = [
            "Hi there! I'm your travel assistant.",
            "Hello! Ready to explore some amazing destinations?",
            "Hey! I'm here to help with all your travel questions.",
            "Greetings, fellow traveler! How can I help today?"
        ]
        self.enthusiasm_phrases = [
            "I absolutely love that place!", "That's one of my favorites!",
            "You've got great taste in destinations!", "What an excellent choice to explore!"
        ]
        self.transition_phrases = [
            "By the way,", "I should mention,", "Also worth noting,", "Something else you might enjoy,"
        ]
        self.follow_up_questions = [
            "Are you planning a trip there soon?", "Have you visited any similar destinations before?",
            "What aspects of travel interest you most?", "Would you like to know about nearby attractions too?",
            "Are you interested in local cuisine as well?"
        ]
        self.travel_facts = [
            "Did you know that the best time to book flights is typically 6-8 weeks before travel?",
            "Fun fact: The world's most visited city is Bangkok, with over 22 million visitors annually.",
            "Travel tip: Local markets are often the best places to experience authentic culture.",
            "Interesting fact: Japan has over 200 ski resorts despite its relatively small size.",
            "Travel insight: Mediterranean destinations are typically less crowded in May and September."
        ]

    def get_greeting(self):
        """Returns a random greeting."""
        return random.choice(self.greetings)

    def enhance_response(self, basic_response, context=None):
        """Takes a basic response and enhances it with personality elements."""
        enhanced = basic_response
        # Add enthusiasm based on context and probability
        if context and context.get('last_topic') and random.random() < self.enthusiasm_level:
            enhanced = random.choice(self.enthusiasm_phrases) + " " + enhanced
        # Add a travel fact occasionally
        if random.random() < 0.3:
            enhanced += f"\n\n{random.choice(self.transition_phrases)} {random.choice(self.travel_facts)}"
        # Add a follow-up question often
        if random.random() < 0.7:
            enhanced += f"\n\n{random.choice(self.follow_up_questions)}"
        return enhanced

    def format_destination_response(self, destination_info, is_comparison=False):
        """Creates human-like responses about destinations, adapting for comparisons."""
        if not destination_info:
            return "Sorry, I couldn't find information on that specific destination."

        # Extract data safely using .get() with defaults
        name = destination_info.get('name', 'This destination')
        country = destination_info.get('country')
        description = destination_info.get('description')
        avg_rating = destination_info.get('avg_rating', 0)
        review_count = destination_info.get('review_count', 0)
        recent_reviews = destination_info.get('recent_reviews', [])

        # Define phrase variations, simpler for comparisons
        greeting_phrases = [ f"Let's look at {name}!", f"Okay, about {name}:", f"Here's the scoop on {name}:"] if not is_comparison else [f"--- {name} ---"]
        description_phrases = ["Key features:", "Known for:", "Travelers mention:", "Highlights:"]
        rating_phrases = [ f"Rating: {avg_rating:.1f}/5 ({review_count} reviews)", f"Avg. Rating: {avg_rating:.1f} stars ({review_count} reviews)", f"Score: {avg_rating:.1f}/5 from {review_count} travelers" ]
        review_intro_phrases = ["Recent reviews mention:", "Latest thoughts:", "Traveler feedback:"]

        # Build the response
        response = f"{random.choice(greeting_phrases)} "
        if country: response += f"({country}) " # Add country context

        # Add rating info
        if review_count > 0: response += f"\n{random.choice(rating_phrases)}"
        else: response += "\n(No rating data yet)"

        # Add description
        if description: response += f"\n{random.choice(description_phrases)} {description}"

        # Add recent review snippets
        if recent_reviews:
            response += f"\n{random.choice(review_intro_phrases)}\n"
            limit = 1 if is_comparison else 2 # Show fewer reviews in comparison
            for review in recent_reviews[:limit]:
                title = review.get('title', 'Review'); rating = review.get('rating', '?')
                content_preview = review.get('content', '')[:80] # Shorter preview
                response += f"- \"{title}\" ({rating}/5): {content_preview}...\n"

        # Add follow-up only if not part of a comparison
        if not is_comparison:
             response += f"\n\nIs there anything specific about {name} you'd like to know?"

        return response.strip()

    def format_list_response(self, items, intro, item_type="destination"):
        """Formats a list of items (destinations, beaches, countries) conversationally."""
        # Handle empty list case directly
        if not items:
            # Provide a slightly more specific message based on item_type
            if item_type == "country":
                return "I don't have enough review data to rank the top countries yet. How about asking for popular destinations instead?"
            else:
                return f"Sorry, I couldn't find any top-rated {item_type}s based on current reviews right now."

        response = f"{intro}\n\n"
        item_prefixes = ["✓", "•", "→", "🌟", "✨"]
        prefix = random.choice(item_prefixes) # Use a random bullet style

        # Format each item
        for i, item in enumerate(items, 1):
            item_text = f"{prefix} {item.get('name', 'Unnamed Item')}"
            if item.get('country'): item_text += f", {item['country']}"
            if 'avg_rating' in item and 'review_count' in item and item.get('review_count', 0) > 0:
                item_text += f" ({item['avg_rating']:.1f}/5 from {item['review_count']} reviews)"
            response += f"{item_text}\n"

        # Add a random follow-up question
        follow_ups = [ f"Would you like more details about any of these {item_type}s?", f"Let me know if you'd like to hear more about a specific {item_type}!", f"I can provide more information about any of these {item_type}s if you're interested.", f"Which of these {item_type}s would you like to know more about?"]
        response += f"\n{random.choice(follow_ups)}"
        return response

    def format_comparison_response(self, info1, info2):
        """ Formats a response comparing two destinations. """
        if not info1 or not info2:
            return "Sorry, I couldn't get enough information to compare those two."

        name1 = info1.get('name', 'the first place')
        name2 = info2.get('name', 'the second place')

        # Structure the comparison
        response = f"Okay, let's compare {name1} and {name2}!\n\n"
        response += self.format_destination_response(info1, is_comparison=True) # Format first item
        response += "\n\n" # Add separation
        response += self.format_destination_response(info2, is_comparison=True) # Format second item
        response += f"\n\nBoth sound interesting! Does one appeal more to you, or would you like to explore other options?" # Concluding question

        return response

# ==============================================================================
# Conversation Context Class
# ==============================================================================
class ConversationContext:
    """Enhanced context tracking for more natural conversations"""
    def __init__(self, session_id):
        """Initializes context from cache or creates a new one."""
        self.session_id = session_id
        self.context_key = f'chat_context_{session_id}'
        self.max_history = 5 # Remember last 5 user/bot turns
        # Default context structure
        self.context = cache.get(self.context_key, {
            'last_topic': None, 'last_entities': [], 'last_entity_ids': [], 'last_response_type': None,
            'user_preferences': {}, 'mentioned_topics': set(), 'conversation_history': [], 'interaction_count': 0
        })

    def update_from_query(self, query, detected_entities=None):
        """Updates context based on the user's query."""
        self.context['interaction_count'] += 1
        # Trim history
        if len(self.context['conversation_history']) >= self.max_history * 2:
            self.context['conversation_history'] = self.context['conversation_history'][2:]
        # Add user query
        self.context['conversation_history'].append({'role': 'user', 'content': query})
        # Basic preference tracking
        query_lower = query.lower()
        if 'beach' in query_lower: self.context['user_preferences']['likes_beaches'] = True
        if 'city' in query_lower: self.context['user_preferences']['likes_cities'] = True
        if 'mountain' in query_lower: self.context['user_preferences']['likes_mountains'] = True

    def update_with_response(self, response, response_type=None, entities=None, entity_ids=None):
        """Updates context based on the bot's response."""
        # Add assistant response
        self.context['conversation_history'].append({'role': 'assistant', 'content': response})
        # Update last response type and entities
        if response_type: self.context['last_response_type'] = response_type
        if entities is not None: self.context['last_entities'] = entities # Allow empty list
        if entity_ids is not None: self.context['last_entity_ids'] = entity_ids # Allow empty list
        # Clear entities if response type doesn't involve specific entities
        if response_type not in ['destinations', 'beaches', 'countries', 'specific_info', 'comparison', 'specific_info_followup']:
             self.context['last_entities'] = []
             self.context['last_entity_ids'] = []
        # Save to cache
        cache.set(self.context_key, self.context, 1800) # 30 minutes expiry

    def get_context_info(self):
        """Returns the current context dictionary."""
        return self.context

# ==============================================================================
# Predefined Response Classes
# ==============================================================================
class CommonResponses:
    """Predefined responses for common simple queries like greetings."""
    def __init__(self, personality):
        self.personality = personality
        self.responses = {
            "greeting": [ "Hello! How can I help?", "Hi there! What travel info?", "Welcome! AI assistant here!", "Greetings! How can I assist?" ],
            "help": [ "I can help with:\n\n• Popular destinations\n• Best beaches\n• Top-rated countries\n• Recent reviews\n• Info on specific places\n\nWhat interests you?", "I assist with finding destinations, beaches, countries, reviews. How can I help?" ],
            "fallback": [ "I'm not quite sure. I help with destinations, beaches, reviews, specific places. Rephrase?", "Could you be more specific? I know about destinations, beaches, countries.", "My expertise is travel destinations/reviews. How can I help?" ]
        }
    def get_response(self, response_type):
        if response_type in self.responses: return random.choice(self.responses[response_type])
        return random.choice(self.responses["fallback"])

class PreResponseHandler:
    """Handler for simple patterns like greetings, thanks, help."""
    def __init__(self):
        self.patterns = {
            r'(?:^|\s)(hi|hello|hey|greetings|howdy)(?:$|\s|[!?.])': ["Hello there!", "Hi!", "Hey!"],
            r'(?:^|\s)(help|assist|what can you do)(?:$|\s|me|with|[!?.])': ["I help find destinations, beaches, countries, reviews. What would you like?", "Ask me about destinations, beaches, countries!"],
            r'(?:^|\s)(thanks|thank you|thx)(?:$|\s|for|so|[!?.])': ["You're welcome!", "Glad I could help!", "My pleasure!"]
        }
    def get_pre_response(self, query):
        query_lower = query.lower()
        for pattern, responses in self.patterns.items():
            if re.search(pattern, query_lower): return random.choice(responses)
        return None

class TravelSpecificResponses:
     """Handles common travel-related questions that might be deflected."""
     def __init__(self):
        self.travel_patterns = {
            r'(?:when|what time|best time|season).{0,20}(?:visit|go to|travel to)': ["Timing depends! Specific place?", "Best time varies. Destination?"],
            r'(?:how to get|transport|travel from|travel to|flight)': ["I focus on destination info, not logistics. Where to?", "Transportation varies. Check travel sites. Where?"],
            r'(?:food|eat|restaurant|cuisine|dish|meal)': ["Food! Best part! Any cuisine?", "Which destination's food scene?"],
            r'(?:visa|passport|entry|requirement|documents)': ["Visa rules change; check official sites. I have destination info!", "Check official sources for visa specifics. Place info?"]
        }
     def get_travel_response(self, query):
        query_lower = query.lower()
        for pattern, responses in self.travel_patterns.items():
            if re.search(pattern, query_lower): return random.choice(responses)
        return None

class ResponseGuidance:
    """Provides guidance when queries are outside the bot's capabilities."""
    def __init__(self):
        self.unanswerable_patterns = {
            r'\b(current|right now|latest|real-time|live).{1,15}(price|cost|weather|availability)\b': "No real-time data (prices/weather). General destination info?",
            r'\b(book|reserve|buy|purchase|pay|transaction)\b': "Can't book, but can help find destinations!",
            r'\b(for me|my preferences|my budget|personalized)\b': "Can't personalize. How about popular places?",
            r'\b(phone number|email|address|contact).{1,15}(hotel|restaurant|airline)\b': "No specific contact details. Focus on reviews.",
            r'\b(stock|politics|recipe|movie|game|sports|news)\b': "My expertise is travel! Destinations or beaches?"
        }
    def check_for_guidance(self, query):
        query_lower = query.lower()
        for pattern, response in self.unanswerable_patterns.items():
            if re.search(pattern, query_lower): return response
        return None

# ==============================================================================
# Database Helper Functions
# ==============================================================================
DESTINATION_CACHE_KEY = 'all_destination_entities'
DESTINATION_CACHE_TIMEOUT = 3600 # Cache entities for 1 hour

def get_all_destination_entities():
    """Fetches and caches all distinct destination names and countries (lowercase)."""
    entities = cache.get(DESTINATION_CACHE_KEY)
    if entities is None:
        entities = []
        try:

            dest_names = list(Destination.objects.values_list('name', flat=True).distinct())
            dest_countries = list(Destination.objects.exclude(country__isnull=True).exclude(country='').values_list('country', flat=True).distinct())

            # Combine, lowercase, remove duplicates, filter short names, sort by length descending
            all_entities = set(n.lower() for n in dest_names + dest_countries if n)
            entities = sorted([e for e in all_entities if len(e) > 2], key=len, reverse=True) # Min length 3
            cache.set(DESTINATION_CACHE_KEY, entities, DESTINATION_CACHE_TIMEOUT)
            logger.info(f"Cached {len(entities)} destination entities.")


        except NameError: # Catch if Destination wasn't imported correctly at the top
            logger.error("Destination model is not defined. Check the import 'from .models import Destination' at the top of the file.")
        except Exception as e:
            logger.error(f"Error fetching destination entities for cache: {e}", exc_info=True)

    if not entities: logger.warning("Entity cache is empty.") # This warning is expected if the try block fails
    return entities

def extract_entity_name(query):
    """Extracts the single longest matching known entity name from the query."""
    query_lower = query.lower()
    all_entities = get_all_destination_entities() # Get cached/DB entities (lowercase, longest first)
    best_match = None
    if not all_entities: return None # Cannot extract if no entities

    # Find the longest entity that matches using word boundaries
    for entity in all_entities:
        pattern = r'\b' + re.escape(entity) + r'\b'
        if re.search(pattern, query_lower):
            # Since entities are sorted longest first, the first match is the longest
            best_match = entity
            break # Found the longest possible match

    if best_match:
        logger.info(f"Extracted single entity: '{best_match}'")
        return best_match.title() # Return title-cased version
    else:
        logger.info(f"No single specific entity extracted using word boundaries.")
        return None

def extract_comparison_entities(query):
    """ Extracts TWO distinct entities mentioned in a comparison query. """
    query_lower = query.lower()
    all_entities = get_all_destination_entities() # lowercase, longest first
    found_matches = [] # Store tuples: (entity_lowercase, start_index, end_index)

    if not all_entities:
        logger.warning("No destination entities found for comparison extraction.")
        return None

    # 1. Find all potential entity matches and their positions, avoiding submatches
    processed_indices = set() # Keep track of indices covered by found matches
    for entity in all_entities:
        pattern = r'\b' + re.escape(entity) + r'\b'
        for match in re.finditer(pattern, query_lower):
            match_start, match_end = match.span()
            # Check if this match significantly overlaps with an already processed region
            is_overlapping = False
            for proc_start, proc_end in processed_indices:
                # Simple overlap check: if start or end is within an existing range
                if (match_start >= proc_start and match_start < proc_end) or \
                   (match_end > proc_start and match_end <= proc_end):
                    is_overlapping = True
                    break
            if not is_overlapping:
                 found_matches.append((entity, match_start, match_end))
                 # Mark this region as processed
                 processed_indices.add((match_start, match_end))

    # 2. Sort the non-overlapping matches by their start position
    found_matches.sort(key=lambda x: x[1])

    # 3. Check if we have at least two distinct entities
    distinct_entities = []
    seen_entities = set()
    for entity, start, end in found_matches:
        if entity not in seen_entities:
            distinct_entities.append(entity.title()) # Store title-cased version
            seen_entities.add(entity)

    if len(distinct_entities) >= 2:
        # Return the first two distinct entities found in query order
        pair = distinct_entities[:2]
        logger.info(f"Extracted comparison pair: {pair}")
        return pair
    else:
        logger.info(f"Found fewer than 2 distinct entities for comparison: {distinct_entities}")
        return None


def execute_query(sql, params=None):
    """Executes a raw SQL query and returns results as a list of dicts."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            if cursor.description is None: return [] # Handle non-SELECT or no-result queries
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Database query error: {e}\nSQL: {sql}\nParams: {params}", exc_info=True)
        return []

def get_destination_info(destination_name):
    """Get detailed information about a specific destination using its name."""
    logger.info(f"Getting info for destination: {destination_name}")
    # Find the destination ID first (case-insensitive search)
    dest_id_result = execute_query("SELECT id FROM travel_destination WHERE LOWER(name) = LOWER(%s) LIMIT 1", [destination_name])
    if not dest_id_result:
         dest_id_result = execute_query("SELECT id FROM travel_destination WHERE LOWER(country) = LOWER(%s) LIMIT 1", [destination_name])
         if not dest_id_result: logger.warning(f"'{destination_name}' not found."); return None

    destination_id = dest_id_result[0]['id']
    # Fetch destination details
    destination_info_list = execute_query("""
        SELECT d.id, d.name, d.country, d.description,
               AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
        FROM travel_destination d
        LEFT JOIN travel_review r ON r.place_id = d.id AND r.moderated = True
        WHERE d.id = %s
        GROUP BY d.id, d.name, d.country, d.description
    """, [destination_id])
    if not destination_info_list: logger.error(f"Failed fetch details ID {destination_id}."); return None
    destination_info = destination_info_list[0]
    # Fetch recent reviews
    recent_reviews = execute_query("""
        SELECT r.title, r.content, r.rating, u.username
        FROM travel_review r JOIN auth_user u ON r.user_id = u.id
        WHERE r.place_id = %s AND r.moderated = True
        ORDER BY r.created_at DESC LIMIT 3
    """, [destination_id])
    destination_info['recent_reviews'] = recent_reviews
    logger.info(f"Found info for {destination_name}: Reviews={len(recent_reviews)}")
    return destination_info

def get_popular_destinations(limit=5):
    """Get popular destinations based on review count and ratings"""
    logger.info("Getting popular destinations")
    return execute_query("""
        SELECT d.id, d.name, d.country, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
        FROM travel_destination d JOIN travel_review r ON r.place_id = d.id
        WHERE r.moderated = True GROUP BY d.id, d.name, d.country
        HAVING COUNT(r.id) > 0 ORDER BY review_count DESC, avg_rating DESC LIMIT %s
    """, [limit])

def get_beach_destinations(limit=5):
    """Get popular beach destinations"""
    logger.info("Getting beach destinations")
    return execute_query("""
        SELECT d.id, d.name, d.country, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
        FROM travel_destination d JOIN travel_review r ON r.place_id = d.id
        WHERE r.moderated = True AND (LOWER(d.name) LIKE '%%beach%%' OR LOWER(d.description) LIKE '%%beach%%' OR LOWER(d.name) LIKE '%%bay%%' OR LOWER(d.name) LIKE '%%coast%%' OR LOWER(d.name) LIKE '%%shore%%' OR LOWER(d.name) LIKE '%%island%%' OR LOWER(d.name) LIKE '%%sand%%' OR LOWER(d.name) IN ('maya bay', 'navagio beach', 'seven mile beach', 'matira beach'))
        GROUP BY d.id, d.name, d.country HAVING COUNT(r.id) > 0
        ORDER BY avg_rating DESC, review_count DESC LIMIT %s
    """, [limit])

def get_top_countries(limit=5):
    """Get top-rated countries based on reviews"""
    logger.info("Getting top countries")
    # Ensure the query correctly aggregates and filters
    return execute_query("""
        SELECT d.country as name, AVG(r.rating) as avg_rating, COUNT(DISTINCT r.id) as review_count
        FROM travel_destination d JOIN travel_review r ON r.place_id = d.id
        WHERE r.moderated = True AND d.country IS NOT NULL AND d.country != ''
        GROUP BY d.country HAVING COUNT(DISTINCT r.id) > 1 -- Ensure country has multiple reviews
        ORDER BY avg_rating DESC, review_count DESC LIMIT %s
    """, [limit])

def get_recent_reviews(limit=3):
    """Get most recent reviews"""
    logger.info("Getting recent reviews")
    return execute_query("""
        SELECT r.id as review_id, r.title, r.rating, d.name as destination_name, u.username, r.created_at
        FROM travel_review r JOIN travel_destination d ON r.place_id = d.id JOIN auth_user u ON r.user_id = u.id
        WHERE r.moderated = True ORDER BY r.created_at DESC LIMIT %s
    """, [limit])

def get_detailed_entity_info(entity_ids, entity_type):
    """Fetches detailed info for a list of entity IDs based on type."""
    logger.info(f"Getting detailed info for {entity_type} IDs: {entity_ids}"); results = [];
    if not entity_ids: return results
    base_query = "SELECT d.id, d.name, d.country, d.description, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count FROM travel_destination d LEFT JOIN travel_review r ON r.place_id = d.id AND r.moderated = True WHERE d.id = %s GROUP BY d.id, d.name, d.country, d.description"
    review_query = "SELECT r.title, r.content, r.rating FROM travel_review r WHERE r.place_id = %s AND r.moderated = True ORDER BY r.created_at DESC LIMIT 2"
    for entity_id in entity_ids:
        try:
            entity_info_list = execute_query(base_query, [entity_id])
            if entity_info_list: entity_info = entity_info_list[0]; recent_reviews = execute_query(review_query, [entity_id]); entity_info['recent_reviews'] = recent_reviews; results.append(entity_info)
        except Exception as e: logger.error(f"Error getting details for {entity_type} ID {entity_id}: {e}", exc_info=True)
    return results

def generate_suggested_responses(context, current_response_type):
    """Generate context-aware suggested response buttons"""
    logger.debug(f"Generating suggestions for context: {context}, response_type: {current_response_type}")
    suggestions = []; last_type = context.get('last_response_type'); last_entities = context.get('last_entities', [])

    # Suggestions after showing a list
    if current_response_type in ['destinations', 'beaches', 'countries'] and last_entities:
        suggestions.append("Tell me more about the first one")
        if len(last_entities) > 1 and last_entities[0].lower() != last_entities[1].lower():
             suggestions.append(f"Compare {last_entities[0]} and {last_entities[1]}")
        suggestions.append("Show different options")

    # Suggestions after showing a comparison
    elif current_response_type == 'comparison' and last_entities and len(last_entities) == 2:
         suggestions.append(f"More about {last_entities[0]}")
         suggestions.append(f"More about {last_entities[1]}")
         suggestions.append("Show different options")

    # Suggestions after showing specific info
    elif current_response_type in ['specific_info', 'specific_info_followup'] and last_entities:
         entity_name = last_entities[0] if last_entities else "this place"
         suggestions.append(f"Best time to visit {entity_name}?")
         suggestions.append(f"Things to do in {entity_name}")
         suggestions.append("Show popular destinations")

    # General suggestions for errors, fallbacks, guidance, empty lists etc.
    elif current_response_type in ['guidance', 'fallback', 'travel_specific',
                                   'specific_info_not_found', 'error_followup',
                                   'clarification_needed', 'error_different_options',
                                   'comparison_partial_match', 'comparison_no_match',
                                   'clarification_needed_comparison', 'clarification_needed_country',
                                   'list_empty', 'list_empty_countries']:
         suggestions = ["Popular destinations", "Best beaches", "Top countries"]

    # Suggestions after simple interactions
    elif current_response_type in ['greeting', 'pre_response', 'help']:
         suggestions = ["Popular destinations", "Best beaches", "Top countries"]

    # Default fallback suggestions
    if not suggestions:
        suggestions = ["Popular destinations", "Best beaches", "Help"]

    # Ensure max 3 unique suggestions
    unique_suggestions = []
    for s in suggestions:
        if s not in unique_suggestions:
            unique_suggestions.append(s)
    return unique_suggestions[:3]

# ==============================================================================
# Main Chatbot API Endpoint
# ==============================================================================
@csrf_exempt
def chatbot_api(request):
    if request.method == 'POST':
        session_id = None
        try:
            # Parse request and get session ID
            try:
                data = json.loads(request.body)
                user_query = data.get('query', '').strip()
                session_id = data.get('session_id', str(uuid.uuid4()))
                logger.info(f"Session {session_id}: Query: '{user_query}'")
            except json.JSONDecodeError:
                logger.warning("Invalid JSON.")
                return JsonResponse({'response': "Invalid request.", 'session_id': str(uuid.uuid4())}, status=400)

            # Initialize components & context
            personality = TravelAssistantPersonality()
            common_responses = CommonResponses(personality)
            pre_handler = PreResponseHandler()
            travel_responses = TravelSpecificResponses()
            guidance = ResponseGuidance()
            conversation = ConversationContext(session_id)
            conversation.update_from_query(user_query)
            context = conversation.get_context_info()
            query_lower = user_query.lower() # Define query_lower once here
            response = None
            response_type = "default"

            # --- Chatbot Logic Flow (Order Matters!) ---

            # 1. Empty/Short Query
            if not user_query or len(user_query) < 3:
                response = common_responses.get_response("greeting")
                response_type = "greeting"

            # 2. Pre-defined Simple Responses
            if not response:
                response = pre_handler.get_pre_response(user_query)
                if response:
                    response_type = "pre_response"

            # 3. Travel-Specific Patterns (Deflection)
            if not response:
                response = travel_responses.get_travel_response(user_query)
                if response:
                    response_type = "travel_specific"

            # 4. Guidance for Out-of-Scope
            if not response:
                response = guidance.check_for_guidance(user_query)
                if response:
                    response_type = "guidance"

            # --- Logging before affirmative check (kept from previous step) ---
            logger.info(f"Session {session_id}: Context before affirmative check: {context}")
            # --------------------------------------------------------------------

            # 5. Affirmative Follow-up ("tell me more", "yes", "first one")
            affirmative_keywords = ['yes', 'yeah', 'yep', 'sure', 'please', 'ok', 'okay', 'tell me more', 'more info', 'details', 'first one']
            # --- MODIFIED LINE: Changed length check from 5 to 8 ---
            is_affirmative_followup = any(keyword in query_lower for keyword in affirmative_keywords) and len(query_lower.split()) <= 8
            # ---------------------------------------------------------

            # Check if no response set yet, if it's an affirmative query, AND correct context
            if not response and is_affirmative_followup and context.get('last_response_type') in ['destinations', 'beaches', 'countries']:
                # --- Log entry confirms this block is entered ---
                logger.info(f"Session {session_id}: Affirmative follow-up condition PASSED. Entering block.")
                # ------------------------------------------------

                last_type = context['last_response_type']
                last_ids = context.get('last_entity_ids', [])
                last_names = context.get('last_entities', [])
                logger.info(f"Session {session_id}: Processing affirmative follow-up for {last_type} (IDs: {last_ids}, Names: {last_names}).")

                entities_to_fetch_ids = []
                if last_ids:
                    # Handle "first one" specifically
                    if "first one" in query_lower:
                         entities_to_fetch_ids = [last_ids[0]]
                         logger.info(f"Focusing on first ID: {entities_to_fetch_ids}")
                    # Otherwise, assume user wants details on all previously listed items
                    else:
                         entities_to_fetch_ids = last_ids
                         logger.info(f"Fetching details for all listed IDs: {entities_to_fetch_ids}")

                # Handle case where last response was 'countries' which might not have IDs
                elif not last_ids and last_names and last_type == 'countries':
                    response = f"Interested in {', '.join(last_names)}. Which country specifically?"
                    response_type = "clarification_needed_country"
                    logger.warning("Cannot fetch country details by name yet.")

                # Fetch details if we have IDs
                if entities_to_fetch_ids:
                    detailed_items = get_detailed_entity_info(entities_to_fetch_ids, last_type)
                    if detailed_items:
                        intro = f"Sure! More details about {'that one' if len(entities_to_fetch_ids) == 1 else f'those {last_type}'}:\n\n"
                        detail_response = intro
                        for item in detailed_items:
                            detail_response += personality.format_destination_response(item) + "\n\n"
                        response = detail_response.strip()
                        response_type = "specific_info_followup"
                        # Update context with the details just shown
                        conversation.update_with_response(response, response_type, [i['name'] for i in detailed_items], [i['id'] for i in detailed_items])
                    else:
                        logger.warning(f"Could not fetch details for {last_type} IDs: {entities_to_fetch_ids}")
                        response = f"Sorry, I couldn't retrieve the details right now. You could try asking about one by name?"
                        response_type = "error_followup"
                # If no IDs and not the country clarification case
                elif not response:
                    logger.warning(f"Affirmative follow-up but no valid IDs/names or specific handling.")
                    response = "Could you specify which one you'd like more details about?"
                    response_type = "clarification_needed"

            # 5.5 "Show different options"
            different_options_keywords = ['different options', 'something else', 'other suggestions', 'show different']
            is_different_options_request = any(keyword in query_lower for keyword in different_options_keywords)
            if not response and is_different_options_request and context.get('last_response_type') in ['destinations', 'beaches', 'countries']:
                 last_type_shown = context['last_response_type']
                 logger.info(f"Detected 'show different options' after {last_type_shown}.")
                 items = []
                 intro = ""
                 new_response_type = "default"
                 # Define the cycle order
                 cycle = ['destinations', 'beaches', 'countries']
                 try:
                     current_index = cycle.index(last_type_shown)
                     next_index = (current_index + 1) % len(cycle)
                     next_type = cycle[next_index]
                 except ValueError:
                     next_type = 'destinations' # Default if last type wasn't in cycle

                 logger.info(f"Cycling from {last_type_shown} to {next_type}")

                 if next_type == 'destinations':
                     items = get_popular_destinations()
                     intro = "Okay, how about some popular destinations?"
                     new_response_type = "destinations"
                 elif next_type == 'beaches':
                     items = get_beach_destinations()
                     intro = "Alright, let's look at some fantastic beaches:"
                     new_response_type = "beaches"
                 elif next_type == 'countries':
                     items = get_top_countries()
                     intro = "How about some top-rated countries?"
                     new_response_type = "countries"

                 response = personality.format_list_response(items, intro, new_response_type[:-1] if new_response_type != 'default' else 'destination')
                 response_type = new_response_type if items else "list_empty"
                 if items:
                     entity_names = [i.get('name') for i in items if i.get('name')]
                     # Pass empty list for countries if IDs aren't available/relevant for countries list
                     entity_ids = [i.get('id') for i in items if i.get('id')] if new_response_type != 'countries' else []
                     conversation.update_with_response(response, response_type, entity_names, entity_ids)
                     logger.info(f"Context updated after showing {new_response_type}: Names={entity_names}, IDs={entity_ids}")
                 else:
                      logger.warning(f"Could not fetch different options ({new_response_type}) after {last_type_shown}.")

            # 6. Comparison Request ("compare X and Y")
            comparison_keywords = ['compare', 'vs', 'versus', 'difference between']
            is_comparison_request = any(keyword in query_lower for keyword in comparison_keywords) and \
                                    re.search(r'\b.+\b\s+(?:and|vs|versus)\s+\b.+\b', query_lower)
            if not response and is_comparison_request:
                logger.info(f"Session {session_id}: Checking for comparison request.")
                entities_to_compare = extract_comparison_entities(user_query)
                if entities_to_compare and len(entities_to_compare) == 2:
                    logger.info(f"Extracted for comparison: {entities_to_compare}")
                    info1 = get_destination_info(entities_to_compare[0])
                    info2 = get_destination_info(entities_to_compare[1])
                    if info1 and info2:
                        response = personality.format_comparison_response(info1, info2)
                        response_type = "comparison"
                        conversation.update_with_response(response, response_type, [info1['name'], info2['name']], [info1.get('id'), info2.get('id')])
                    elif info1:
                        response = f"Found info for {info1['name']}, but not {entities_to_compare[1]}. Want to know about {info1['name']}?"
                        response_type = "comparison_partial_match"
                        # Update context for the one found, allowing follow-up
                        conversation.update_with_response(response, "specific_info", [info1['name']], [info1.get('id')])
                    elif info2:
                        response = f"Found info for {info2['name']}, but not {entities_to_compare[0]}. Want to know about {info2['name']}?"
                        response_type = "comparison_partial_match"
                        # Update context for the one found
                        conversation.update_with_response(response, "specific_info", [info2['name']], [info2.get('id')])
                    else:
                        logger.warning(f"No info for comparison entities: {entities_to_compare}")
                        response = f"Sorry, I couldn't find info for {entities_to_compare[0]} or {entities_to_compare[1]}. Try asking about popular places?"
                        response_type = "comparison_no_match"
                else:
                    logger.info("Could not extract two entities for comparison.")
                    response = "Want to compare two places? Please state both names clearly, like 'compare X and Y'."
                    response_type = "clarification_needed_comparison"

            # 7. Single Specific Entity Request (if not comparison)
            if not response:
                logger.info(f"Session {session_id}: Checking for single specific entity name...")
                entity_name = extract_entity_name(user_query)
                if entity_name:
                    logger.info(f"Extracted entity '{entity_name}'. Getting info...")
                    entity_info = get_destination_info(entity_name)
                    if entity_info:
                        response = personality.format_destination_response(entity_info)
                        response_type = "specific_info"
                        conversation.update_with_response(response, response_type, [entity_info['name']], [entity_info['id']])
                    else:
                        logger.warning(f"Entity '{entity_name}' extracted but no info found.")
                        # Avoid dead end - suggest alternatives
                        response = f"I see you mentioned '{entity_name}', but I couldn't find specific details in my database. Would you like to see popular destinations or beaches instead?"
                        response_type = "specific_info_not_found"

            # 8. General List Requests (if not handled above)
            if not response:
                 # Top Destinations
                 if re.search(r'\b(top|best|popular|favorite|recommend)\b.*\b(destinations?|places?|locations?|spots?)\b', query_lower):
                      logger.info("Matched 'top destinations'.")
                      items = get_popular_destinations()
                      response = personality.format_list_response(items, "Highly-rated destinations:", "destination")
                      response_type = "destinations" if items else "list_empty"
                      if items:
                          conversation.update_with_response(response, response_type, [i['name'] for i in items], [i['id'] for i in items])
                          logger.info(f"Context updated after showing destinations: Names={[i['name'] for i in items]}, IDs={[i['id'] for i in items]}")
                 # Best Beaches
                 elif re.search(r'\b(top|best|popular|favorite|recommend|beautiful)\b.*\b(beach|beaches|coast|shore|seaside)\b', query_lower):
                      logger.info("Matched 'best beaches'.")
                      items = get_beach_destinations()
                      response = personality.format_list_response(items, "Travelers love these beaches:", "beach")
                      response_type = "beaches" if items else "list_empty"
                      if items:
                          conversation.update_with_response(response, response_type, [i['name'] for i in items], [i['id'] for i in items])
                          logger.info(f"Context updated after showing beaches: Names={[i['name'] for i in items]}, IDs={[i['id'] for i in items]}")
                 # Top Countries
                 elif re.search(r'\b(top|best|popular|favorite|recommend)\b.*\b(countries|country|nations?)\b', query_lower):
                      logger.info("Matched 'top countries'.")
                      items = get_top_countries()
                      response = personality.format_list_response(items, "Top marks for these countries:", "country")
                      response_type = "countries" if items else "list_empty_countries"
                      if items:
                          entity_names = [i['name'] for i in items]
                          entity_ids = [i.get('id') for i in items if i.get('id')] # Attempt to get IDs if available
                          conversation.update_with_response(response, response_type, entity_names, entity_ids)
                          logger.info(f"Context updated after showing countries: Names={entity_names}, IDs={entity_ids}")


            # 9. Fallback
            if not response:
                logger.info(f"Session {session_id}: No pattern matched, using fallback.")
                response = common_responses.get_response("fallback")
                response_type = "fallback"

            # Check if the last assistant message in history matches the current response content
            current_context_data = conversation.get_context_info()
            last_assistant_response_content = None
            history = current_context_data.get('conversation_history', [])
            if len(history) > 1 and history[-1]['role'] == 'assistant':
                 last_assistant_response_content = history[-1].get('content')

            if response != last_assistant_response_content:
                 # This case covers fallbacks, errors, clarifications etc. where context might not have been explicitly saved by the logic block
                 conversation.update_with_response(response, response_type)
                 logger.info(f"Context updated in final step for response type {response_type}.")


            logger.info(f"Session {session_id}: Sending response (type: {response_type}): {response[:100]}...")
            # Generate suggestions based on the context *after* potential final update
            final_context = conversation.get_context_info()
            suggested_responses = generate_suggested_responses(final_context, response_type)

            return JsonResponse({'response': response, 'session_id': session_id, 'suggested_responses': suggested_responses})

        # --- Error Handling ---
        except Exception as e:
            logger.error(f"Unhandled error in chatbot_api (Session: {session_id}): {e}", exc_info=True)
            final_session_id = session_id if session_id else str(uuid.uuid4())
            return JsonResponse({
                'response': "Sorry, I encountered an unexpected technical issue. Please try again later.",
                'session_id': final_session_id
            }, status=500)
    else:
        # Handle non-POST requests
        return JsonResponse({'response': 'Please use POST method.'}, status=405)
