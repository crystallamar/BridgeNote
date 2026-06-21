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
        date = c.get("entry_date") or c.get("timestamp", "")[:10]
        mood = c.get("mood_score", "N/A")
        label = c.get("mood_label", "")
        sentiment = c.get("sentiment_label", "")
        journal = c.get("journal_entry", "")

        # Slider values (new format)
        slider_vals = c.get("slider_values") or {}
        slider_str = ", ".join(f"{k} {v}/10" for k, v in slider_vals.items()) if slider_vals else ""

        entry = f"- {date}: Mood {mood}/5 ({label})"
        if slider_str:
            entry += f", {slider_str}"
        if sentiment:
            entry += f", journal sentiment: {sentiment}"
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

Always be warm, curious, and grounded. Use open-ended questions. Reflect back what you hear. Never give medical advice.

**Response length:** Keep responses concise — 2 to 4 sentences, then one open question. Less is more. Do not list multiple questions or give lengthy explanations."""

    # Inject therapist context — capped at 300 words
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

        raw_section = f"""## Client Context (provided by therapist — confidential)
**Client name:** {name}
**Treatment goals:** {', '.join(goals) if goals else 'Not specified'}
**Known triggers:** {', '.join(triggers) if triggers else 'None specified'}
**Client strengths:** {', '.join(strengths) if strengths else 'None specified'}
**Working diagnoses:** {', '.join(diagnoses) if diagnoses else 'Not disclosed'}
**Last session:** {last_date or 'Unknown'}
**Last session summary:** {last_summary or 'Not available'}
**Therapist notes:** {notes or 'None'}

Use this context to personalize your responses. Reference treatment goals when relevant. Avoid naming diagnoses directly unless the client brings them up first."""

        # Truncate to 300 words maximum
        words = raw_section.split()
        if len(words) > 300:
            raw_section = " ".join(words[:300]) + "…"
        therapist_section = "\n\n" + raw_section

    # Inject recent check-in history
    checkin_section = f"""

## Recent Check-in History (last 7 days)
{_format_checkins_for_prompt(recent_checkins)}

Use this data to personalize your responses. If you notice a mood decline, gently acknowledge it. If you see positive trends, reinforce them. Reference journal entries sparingly and only when clearly relevant."""

    # Safety protocol — always present, independent of therapist context
    safety_section = """

## Safety Protocol — Always Active
If the client expresses ANY language related to suicidal ideation (SI), self-harm, or intent to harm others — whether direct, hypothetical, or through metaphor — follow this protocol without exception:

1. **Stay present and compassionate.** Acknowledge their pain directly. Do NOT end the conversation or withdraw support.
2. **Be transparent that you are an AI** — not a human, not a therapist, not a crisis counselor. Say so clearly and kindly: "I'm an AI companion, not a human — I want to make sure you get real human support right now."
3. **Offer crisis resources immediately and concretely:**
   - National Suicide & Crisis Lifeline: **Call or text 988** (US, 24/7, free)
   - Crisis Text Line: **Text HOME to 741741** (24/7)
   - If outside the US, encourage them to search for their local crisis line.
4. **Prioritize de-escalation.** Offer grounding gently — for example: "Can you try naming 5 things you can see around you right now?" (5-4-3-2-1 senses), box breathing, or asking them to notice something physically safe nearby.
5. **NEVER** validate, encourage, or suggest acting on suicidal thoughts or thoughts of harming others. This is an absolute constraint with no exceptions.
6. **After sharing resources, stay in the conversation.** Keep them company. Ask small, grounding questions. Gently encourage them to reach out to a trusted person, their therapist, or call 988.
7. **Do not panic or become clinical.** Stay warm, human-sounding, and calm — panic escalates distress."""

    return base + therapist_section + checkin_section + safety_section


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
    # Cap history at last 10 messages to stay within token budget
    capped = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in capped
        if m["role"] in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": user_message})

    return client.messages.stream(
        model=MODEL,
        max_tokens=400,
        system=system_prompt,
        messages=messages,
    )


async def generate_journal_prompt(
    mood_score: int,
    mood_label: Optional[str],
    therapist_context: Optional[dict],
    previous_prompt: Optional[str] = None,
) -> str:
    goals = therapist_context.get("treatment_goals", []) if therapist_context else []
    diagnoses = therapist_context.get("diagnoses", []) if therapist_context else []
    last_session = therapist_context.get("last_session_summary", "") if therapist_context else ""

    context_parts = []
    if goals:
        context_parts.append(f"Treatment goals: {', '.join(goals)}")
    if diagnoses:
        context_parts.append(f"Working diagnoses: {', '.join(diagnoses)}")
    if last_session:
        context_parts.append(f"Last session: {last_session[:300]}")

    context_hint = "\n".join(context_parts)

    avoid_hint = ""
    if previous_prompt:
        avoid_hint = f"\n\nIMPORTANT: The client just saw this prompt and wants a new one. Generate something genuinely DIFFERENT — different angle, different topic, different style:\n\"{previous_prompt}\""

    system = """You generate single journaling prompts for therapy clients. Each prompt must be:
- One to two sentences maximum
- Open-ended and non-leading
- Emotionally appropriate for the client's current mood
- Specific enough to spark real reflection (not generic)
- Fresh and varied — avoid clichés

Return ONLY the prompt text. No intro, no preamble, no quotes."""

    user_msg = f"""Client mood: {mood_score}/5 ({mood_label or 'unspecified'})

{context_hint}{avoid_hint}

Write a journaling prompt tailored to this specific person and their current state."""

    message = client.messages.create(
        model=MODEL,
        max_tokens=150,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return message.content[0].text.strip('"').strip()


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
