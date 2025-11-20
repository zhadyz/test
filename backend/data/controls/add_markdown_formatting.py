#!/usr/bin/env python3
"""
Add markdown formatting to plain-text AI guidance.
"""
import json
import re
from pathlib import Path

def format_as_markdown(text):
    """Convert plain text guidance to markdown format."""
    # Already has markdown formatting
    if text.startswith('**') or '```' in text:
        return text

    # Split into sentences for better formatting
    lines = []

    # Add opening context in bold if it starts with technical instruction
    if text.startswith(('Configure', 'Implement', 'Deploy', 'Provide', 'Store', 'Protect', 'Restrict', 'Enforce')):
        # Find first period to get first sentence
        first_period = text.find('. ')
        if first_period > 0:
            first_sentence = text[:first_period + 1]
            rest = text[first_period + 2:]
            lines.append(f"**{first_sentence}**\n")
            text = rest

    # Find and format code snippets (text in backticks)
    text = re.sub(r'`([^`]+)`', r'`\1`', text)

    # Find and format file paths (starting with /)
    text = re.sub(r'(/[a-zA-Z0-9_/.-]+)', r'`\1`', text)

    # Find and format commands in parentheses
    text = re.sub(r'\(([a-z-]+\s[^)]+)\)', r'(`\1`)', text)

    # Bold "On RHEL" and similar platform indicators
    text = re.sub(r'(On RHEL \d+/\d+|On Windows Server|For Windows)', r'**\1**', text)

    # Format lists (look for patterns like "1. ", "- ", etc.)
    paragraphs = text.split('. ')
    formatted_paragraphs = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Add period back if it's a complete sentence
        if para and not para.endswith((':', ')', ',')):
            para += '.'

        formatted_paragraphs.append(para)

    return '\n\n'.join([l for l in [lines[0] if lines else ''] + formatted_paragraphs if l])

def add_markdown_to_controls():
    """Add markdown formatting to controls with plain text guidance."""
    au_file = Path(__file__).parent / 'AU.json'

    with open(au_file, 'r', encoding='utf-8') as f:
        au_data = json.load(f)

    formatted_count = 0
    for control in au_data:
        guidance = control.get('ai_guidance', '')

        # Skip if empty or already formatted
        if not guidance or guidance.startswith('**') or '```' in guidance:
            continue

        # Format the guidance
        formatted = format_as_markdown(guidance)
        control['ai_guidance'] = formatted
        formatted_count += 1
        print(f"Formatted {control.get('control_id')}")

    # Write back
    with open(au_file, 'w', encoding='utf-8') as f:
        json.dump(au_data, f, indent=2, ensure_ascii=False)

    print(f"\nFormatted {formatted_count} controls with markdown")

if __name__ == '__main__':
    add_markdown_to_controls()
