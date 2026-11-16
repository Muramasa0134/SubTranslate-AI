import json
import logging
from typing import List, Dict, Optional
from google import genai
from google.genai import types
from app.utils.config import settings
from app.models.schemas import SubtitleItem, SubtitlePairItem

logger = logging.getLogger(__name__)

LANGUAGE_NAMES: Dict[str, str] = {
    "auto": "Auto Detect",
    "vi": "Vietnamese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ru": "Russian",
    "th": "Thai",
    "id": "Indonesian",
    "pt": "Portuguese",
    "it": "Italian",
    "ar": "Arabic",
    "hi": "Hindi",
}

class GeminiTranslationService:
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        if not self.api_key:
            raise ValueError(
                "Gemini API Key is missing. Please set GEMINI_API_KEY in backend/.env or configure it in the web interface."
            )
        self.client = genai.Client(api_key=self.api_key)

    def _get_target_lang_name(self, code: str) -> str:
        return LANGUAGE_NAMES.get(code.lower(), code)

    def _get_source_lang_name(self, code: str) -> str:
        if code.lower() == "auto":
            return "the original spoken language"
        return LANGUAGE_NAMES.get(code.lower(), code)

    def translate_batch(
        self,
        batch: List[SubtitleItem],
        source_lang: str,
        target_lang: str,
        translation_style: str = "cinematic",
        context_hint: Optional[str] = None,
        prev_context_pairs: Optional[List[SubtitlePairItem]] = None
    ) -> List[SubtitlePairItem]:
        """
        Translates a single batch of SubtitleItems into SubtitlePairItems
        using Gemini API with professional context-aware subtitle localization guidelines.
        """
        source_name = self._get_source_lang_name(source_lang)
        target_name = self._get_target_lang_name(target_lang)

        # Style guidelines
        style_instructions = {
            "cinematic": (
                "Style: CINEMATIC & DRAMA. Translate expressively with natural spoken dialogue, emotional depth, and idiomatic flow. "
                "Capture subtext, humor, and sarcasm naturally. Avoid stiff or bookish translations."
            ),
            "casual": (
                "Style: CASUAL & VLOG. Everyday modern conversational speech, friendly, relaxed phrasing, and colloquial idioms suitable for YouTube, podcasts, and casual conversations."
            ),
            "tech": (
                "Style: TECHNOLOGY & CODING. Keep standard programming, engineering, and software terminology (e.g. API, frontend, backend, model, framework, deployment) in English without awkward translation. Precise and articulate."
            ),
            "anime": (
                "Style: ANIME & ACTION. Honor character archetypes, battle cries, special moves, and iconic titles. Maintain proper names and cultural honorific nuances."
            ),
            "formal": (
                "Style: FORMAL & DOCUMENTARY. Sophisticated, articulate, respectful, and grammatically refined tone suitable for news, speeches, or documentaries."
            )
        }
        selected_style_guide = style_instructions.get(translation_style.lower(), style_instructions["cinematic"])

        # Context hint section if provided by user
        context_section = ""
        if context_hint and context_hint.strip():
            context_section = f"USER CONTEXT / GLOSSARY HINT:\n{context_hint.strip()}\n"

        # Previous dialogue context section to ensure pronoun and tone consistency across batch borders
        prev_dialogue_section = ""
        if prev_context_pairs and len(prev_context_pairs) > 0:
            prev_lines = [
                f"- [Line {p.index}]: \"{p.original}\" -> \"{p.translated}\""
                for p in prev_context_pairs[-4:]
            ]
            prev_dialogue_section = (
                "PREVIOUS DIALOGUE CONTEXT (Reference for speaker tone, relationships, and pronoun consistency):\n"
                + "\n".join(prev_lines) + "\n"
            )

        # Prepare payload for Gemini prompt
        input_data = [
            {"index": item.index, "text": item.text}
            for item in batch
        ]

        prompt = f"""You are an elite audiovisual subtitle localization specialist (Netflix / HBO / BBC subtitle standards).
Your mission is to translate spoken dialogue from {source_name} to {target_name} with exceptional naturalness, context continuity, and cinematic clarity.

{selected_style_guide}

{context_section}
{prev_dialogue_section}
CRITICAL SUBTITLE LOCALIZATION RULES:
1. SPOKEN AUTHENTICITY: Translate meaning, intent, and emotion rather than literal word-for-word translation. Subtitles must sound like genuine spoken dialogue when read aloud.
2. PRONOUN & PERSONA CONSISTENCY (Crucial for Vietnamese & Asian languages):
   - Analyze the social hierarchy, closeness, age, and emotional dynamic between speakers.
   - Maintain STRICTLY CONSISTENT pronouns (e.g. anh/em, bạn/tôi, cậu/tớ, mày/tao) for the same speaker throughout the dialogue. Never oscillate randomly between different pronouns.
3. SUBTITLE BREVITY & READING SPEED: Viewers read subtitles in 1-3 seconds. Keep translations punchy, concise, and natural. Eliminate unnecessary filler words while preserving 100% of the meaning and emotional weight.
4. PROPER NOUNS & BRAND NAMES: Preserve proper names (people, places), brand names, and universally recognized titles without awkward translation.
5. STRICT 1-TO-1 INDEX PRESERVATION: Keep the EXACT same index numbers as provided. DO NOT merge, split, or skip any entry.
6. OUTPUT FORMAT: Output ONLY a valid JSON array of objects. Each object must have "index" (integer) and "translated" (string).

Input subtitles JSON:
{json.dumps(input_data, ensure_ascii=False, indent=2)}

Return strictly a JSON array formatted like:
[
  {{"index": <int>, "translated": "<translated text>"}},
  ...
]
"""

        models_to_try = [self.model_name]
        for fallback in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        response = None
        last_error = None
        for m_name in models_to_try:
            try:
                # Disable thinking tokens to slash latency from ~28s down to ~1.5s
                gen_config = types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
                response = self.client.models.generate_content(
                    model=m_name,
                    contents=prompt,
                    config=gen_config
                )
                if response and response.text:
                    break
            except Exception as e:
                # If thinking_budget=0 is not supported on a specific model, fallback without it
                try:
                    fallback_config = types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.3
                    )
                    response = self.client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config=fallback_config
                    )
                    if response and response.text:
                        break
                except Exception as inner_e:
                    logger.warning(f"Gemini model {m_name} failed: {inner_e}. Trying next fallback...")
                    last_error = inner_e

        if response is None or not response.text:
            logger.error(f"All Gemini models failed: {last_error}")
            raise last_error or RuntimeError("Gemini failed to generate response.")

        try:
            raw_text = response.text.strip()
            # Parse response JSON
            translations_map = {}
            parsed_data = json.loads(raw_text)

            if isinstance(parsed_data, list):
                for entry in parsed_data:
                    idx = entry.get("index")
                    trans = entry.get("translated", "")
                    if idx is not None:
                        translations_map[int(idx)] = trans.strip()
            elif isinstance(parsed_data, dict):
                # In case model returned {"subtitles": [...]}
                for val in parsed_data.values():
                    if isinstance(val, list):
                        for entry in val:
                            idx = entry.get("index")
                            trans = entry.get("translated", "")
                            if idx is not None:
                                translations_map[int(idx)] = trans.strip()

        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            raise e

        # Construct SubtitlePairItem ensuring all items in batch are preserved
        results: List[SubtitlePairItem] = []
        for item in batch:
            translated_text = translations_map.get(item.index, "").strip()
            # If for some reason Gemini omitted an entry, fallback to original
            if not translated_text:
                translated_text = item.text

            results.append(SubtitlePairItem(
                index=item.index,
                start=item.start,
                end=item.end,
                start_ms=item.start_ms,
                end_ms=item.end_ms,
                original=item.text,
                translated=translated_text
            ))

        return results

    def translate_all(
        self,
        items: List[SubtitleItem],
        source_lang: str = "auto",
        target_lang: str = "vi",
        translation_style: str = "cinematic",
        context_hint: Optional[str] = None,
        batch_size: int = 60,  # Increased from 25 to 60 for 2-3x fewer network roundtrips & broader context
        progress_callback=None
    ) -> List[SubtitlePairItem]:
        """
        Translates all subtitles in batches, preserving sequence, timestamps,
        and continuous conversational context across batch borders.
        """
        if not items:
            return []

        all_results: List[SubtitlePairItem] = []
        total_items = len(items)
        
        # Split into batches
        batches = [items[i:i + batch_size] for i in range(0, total_items, batch_size)]
        
        for batch_idx, batch in enumerate(batches):
            # Pass the last 3 translated pairs from previous batch as context continuity
            prev_context = all_results[-3:] if all_results else None

            batch_result = self.translate_batch(
                batch=batch,
                source_lang=source_lang,
                target_lang=target_lang,
                translation_style=translation_style,
                context_hint=context_hint,
                prev_context_pairs=prev_context
            )
            all_results.extend(batch_result)
            
            if progress_callback:
                progress_callback(len(all_results), total_items)

        return all_results
