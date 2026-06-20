import anthropic
import os
from typing import List, Optional, AsyncIterator
from .redis_client import get_recent_checkins, get_therapist_context

MODEL = "claude-sonnet-4-6"

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _format_checkins_for_prompt(checkins: List[dict]) -> str:
    if not checkins:
        return "No recent check-ins available."

    lines = []
    for c in checkins:
        date = c.get("timestamp", "")[:10]
        mood = c.get("mood_score", "N/A")
        label = c.get("mood_label", "")
        anxiety = c.get("anxiety_level", "N/A")
        energy = c.get("energy_level", "N/A")
        sleep = c.get("sleep_hours", "N/A")
        sentiment = c.get("sentiment_label", "")
        journal = c.get("journal_entry", "")

        entry = f"- {date}: Mood {mood}/10 ({label}), Anxiety {anxiety}/10, Energy {energy}/10, Sleep {sleep}h"
        if sentiment:
            entry += f", Journal sentiment: {sentiment}"
        if journal:
            snippet = journal[:200] + "..." if len(journal) > 200 else journal
            entry += f'\n  Journal: "{snippet}"'
        lines.append(entry)

    return "\n".join(lines)


def _build_system_prompt(
    therapist_context: Optional[dict],
    recent_checkins: List[dict],
) -> str:
    # Base therapeutic persona
    base = """You are BridgeNote, a compassionate AI companion designed to support therapy clients between sessions. You are NOT a therapist and never provide clinical diagnoses or replace professional care. Your role is to:
- Offer a safe, non-judgmental space for reflection
- Help clients process their thoughts and feelings
- Reinforce coping strategies their therapist has introduced
- Gently notice patterns and encourage positive action
- Escalate safety concerns clearly (always direct to crisis resources if needed)

Always be warm, curious, and grounded. Use open-ended questions. Reflect back what you hear. Never give medical advice."""

    # Inject therapist context
    therapist_section = ""
    if therapist_context:
        name = therapist_context.get("client_name", "the client")
        goals = therapist_context.get("treatment_goals", [])
        triggers = therapist_context.get("triggers", [])
        strengths = therapist_context.get("strengths", [])
        diagnoses = therapist_context.get("diagnoses", [])
        last_summary = therapist_context.get("last_session_summary", "")
        last_date = therapist_context.get("last_session_date", "")
        notes = therapist_context.get("notes", "")

        therapist_section = f"""

## Client Context (provided by therapist — confidential)
**Client name:** {name}
**Treatment goals:** {', '.join(goals) if goals else 'Not specified'}
**Known triggers:** {', '.join(triggers) if triggers else 'None specified'}
**Client strengths:** {', '.join(strengths) if strengths else 'None specified'}
**Working diagnoses:** {', '.join(diagnoses) if diagnoses else 'Not disclosed'}
**Last session:** {last_date or 'Unknown'}
**Last session summary:** {last_summary or 'Not available'}
**Therapist notes:** {notes or 'None'}

Use this context to personalize your responses. Reference treatment goals when relevant. Avoid naming diagnoses directly unless the client brings them up first."""

    # Inject recent check-in history
    checkin_section = f"""

## Recent Check-in History (last 7 days)
{_format_checkins_for_prompt(recent_checkins)}

Use this data to personalize your responses. If you notice a mood decline, gently acknowledge it. If you see positive trends, reinforce them. Reference journal entries sparingly and only when clearly relevant."""

    return base + therapist_section + checkin_section


async def build_dynamic_system_prompt(client_id: str) -> str:
    therapist_context, recent_checkins = await _fetch_context(client_id)
    return _build_system_prompt(therapist_context, recent_checkins)


async def _fetch_context(client_id: str):
    import asyncio
    context, checkins = await asyncio.gather(
        get_therapist_context(client_id),
        get_recent_checkins(client_id, limit=7),
    )
    return context, checkins


def stream_chat(
    system_prompt: str,
    conversation_history: List[dict],
    user_message: str,
) -> anthropic.Stream:
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in conversation_history
        if m["role"] in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": user_message})

    return client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )


async def generate_journal_prompt(
    mood_score: int,
    mood_label: Optional[str],
    therapist_context: Optional[dict],
) -> str:
    goals = []
    if therapist_context:
        goals = therapist_context.get("treatment_goals", [])

    context_hint = f"Their treatment goals include: {', '.join(goals)}." if goals else ""

    prompt = f"""Generate a single, thoughtful journaling prompt for a therapy client who just reported:
- Mood score: {mood_score}/10 ({mood_label or 'not labeled'})
{context_hint}

The prompt should be open-ended, non-leading, and appropriate for their current emotional state. If mood is low (1-4), be especially gentle and focus on self-compassion. If moderate (5-7), encourage reflection. If high (8-10), invite savoring and growth. Return only the prompt text, no preamble."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def summarize_conversation(messages: List[dict]) -> str:
    if not messages:
        return "No conversation to summarize."

    transcript = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": f"""Summarize the following therapy support chatbot conversation for the client's therapist. Be concise (3-5 bullet points). Note: emotional themes discussed, any concerns raised, coping strategies mentioned, and overall tone.\n\n{transcript}""",
            }
        ],
    )
    return response.content[0].text
