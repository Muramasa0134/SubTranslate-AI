import re
import pysubs2
from typing import List, Tuple
from app.models.schemas import SubtitleItem, SubtitlePairItem

def smart_wrap_text(text: str, max_chars_per_line: int = 38) -> str:
    """
    Intelligently breaks a subtitle string into at most 2 balanced, natural lines.
    
    Principles:
    1. If text fits within `max_chars_per_line`, keep single line.
    2. If text already has manual line breaks, preserve them.
    3. Finds the optimal syntactic breakpoint near the center of the text:
       - Prioritizes punctuation (comma, semicolon, dash, period, colon)
       - Prioritizes natural conjunctions & prepositions in Vietnamese & English
       - Balances length between Line 1 and Line 2 (prevents orphan words).
    """
    text = text.strip()
    if not text or len(text) <= max_chars_per_line:
        return text

    existing_lines = text.splitlines()
    if len(existing_lines) > 1:
        return '\n'.join(line.strip() for line in existing_lines if line.strip())

    words = text.split()
    if len(words) <= 3:
        return text

    mid = len(text) // 2
    best_idx = -1
    best_score = float('inf')

    # Common connectors that make natural break points
    viet_connectors = {
        'và', 'hay', 'nhưng', 'mà', 'nếu', 'thì', 'vì', 'để', 'với', 'trong',
        'khi', 'cho', 'của', 'là', 'sẽ', 'đã', 'đang', 'về', 'tại', 'như'
    }
    en_connectors = {
        'and', 'but', 'or', 'so', 'because', 'with', 'that', 'which', 'when',
        'if', 'to', 'in', 'on', 'at', 'for', 'about', 'as', 'into'
    }

    curr_pos = 0
    for i, w in enumerate(words[:-1]):
        curr_pos += len(w) + 1  # end of word + space
        dist_from_mid = abs(curr_pos - mid)
        score = dist_from_mid

        # Punctuation bonus (lower score is better)
        if any(w.endswith(p) for p in [',', '.', ';', ':', '!', '?', ' -', '—']):
            score -= 15
        elif w.lower() in viet_connectors or w.lower() in en_connectors:
            score -= 8

        # Penalize if one line would be drastically too long
        line1_len = curr_pos
        line2_len = len(text) - curr_pos
        if line1_len > max_chars_per_line + 8 or line2_len > max_chars_per_line + 8:
            score += 25

        if score < best_score:
            best_score = score
            best_idx = i

    if best_idx != -1:
        line1 = ' '.join(words[:best_idx + 1])
        line2 = ' '.join(words[best_idx + 1:])
        return f"{line1}\n{line2}"

    return text

def ms_to_srt_time(ms: int) -> str:
    """Converts milliseconds to SRT time format: HH:MM:SS,mmm"""
    if ms < 0:
        ms = 0
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    seconds = (ms % 60000) // 1000
    milliseconds = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def srt_time_to_ms(time_str: str) -> int:
    """Converts SRT time string (HH:MM:SS,mmm or HH:MM:SS.mmm) to milliseconds"""
    time_str = time_str.replace('.', ',').strip()
    match = re.match(r'(\d+):(\d{2}):(\d{2}),(\d{1,3})', time_str)
    if not match:
        return 0
    h, m, s, ms = match.groups()
    ms = ms.ljust(3, '0')[:3]
    return int(h) * 3600000 + int(m) * 60000 + int(s) * 1000 + int(ms)

class SRTService:
    @staticmethod
    def parse_srt_content(content: str) -> List[SubtitleItem]:
        """
        Parses SRT string content into a list of SubtitleItem objects.
        Tries pysubs2 first, falls back to regex parser if needed.
        """
        # Remove BOM if present
        if content.startswith('\ufeff'):
            content = content[1:]

        items: List[SubtitleItem] = []

        try:
            subs = pysubs2.SSAFile.from_string(content, format_="srt")
            for idx, event in enumerate(subs, start=1):
                clean_text = event.text.replace(r"\N", "\n").replace(r"\n", "\n").strip()
                if not clean_text:
                    continue
                start_str = ms_to_srt_time(event.start)
                end_str = ms_to_srt_time(event.end)
                items.append(SubtitleItem(
                    index=idx,
                    start=start_str,
                    end=end_str,
                    start_ms=event.start,
                    end_ms=event.end,
                    text=clean_text
                ))
            if items:
                return items
        except Exception:
            # Fallback to custom regex parser
            pass

        # Regex fallback parser
        # SRT block format: index \n start --> end \n text \n\n
        blocks = re.split(r'\r?\n\r?\n', content.strip())
        current_idx = 1
        for block in blocks:
            lines = [line.strip() for line in block.splitlines() if line.strip()]
            if len(lines) < 2:
                continue

            time_line_idx = -1
            for i, line in enumerate(lines[:3]):
                if "-->" in line:
                    time_line_idx = i
                    break

            if time_line_idx == -1:
                continue

            time_line = lines[time_line_idx]
            time_parts = time_line.split("-->")
            if len(time_parts) != 2:
                continue

            start_str = time_parts[0].strip()
            end_str = time_parts[1].strip()
            # Clean possible trailing coordinate markers (e.g. X1:0 Y1:0)
            end_str = end_str.split()[0].strip()

            text_lines = lines[time_line_idx + 1:]
            text = "\n".join(text_lines).strip()
            if not text:
                continue

            start_ms = srt_time_to_ms(start_str)
            end_ms = srt_time_to_ms(end_str)

            items.append(SubtitleItem(
                index=current_idx,
                start=ms_to_srt_time(start_ms),
                end=ms_to_srt_time(end_ms),
                start_ms=start_ms,
                end_ms=end_ms,
                text=text
            ))
            current_idx += 1

        return items

    @staticmethod
    def chunk_subtitles(items: List[SubtitleItem], chunk_size: int = 30) -> List[List[SubtitleItem]]:
        """Splits subtitle items into chunks of fixed size for batch translation."""
        return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]

    @staticmethod
    def generate_srt_from_pairs(pairs: List[SubtitlePairItem], use_translated: bool = True, smart_wrap: bool = False) -> str:
        """Generates a standard .srt formatted string from subtitle pairs with optional smart line-wrapping."""
        lines = []
        for pair in pairs:
            text = pair.translated.strip() if use_translated else pair.original.strip()
            # If translated text is empty for some reason, fallback to original
            if not text:
                text = pair.original.strip()
            if smart_wrap:
                text = smart_wrap_text(text)
            lines.append(f"{pair.index}")
            lines.append(f"{pair.start} --> {pair.end}")
            lines.append(text)
            lines.append("")  # Empty line between blocks
        return "\n".join(lines).strip() + "\n"

    @staticmethod
    def generate_srt_from_items(items: List[SubtitleItem], smart_wrap: bool = False) -> str:
        """Generates a standard .srt formatted string from SubtitleItems with optional smart line-wrapping."""
        lines = []
        for item in items:
            text = item.text.strip()
            if smart_wrap:
                text = smart_wrap_text(text)
            lines.append(f"{item.index}")
            lines.append(f"{item.start} --> {item.end}")
            lines.append(text)
            lines.append("")
        return "\n".join(lines).strip() + "\n"
