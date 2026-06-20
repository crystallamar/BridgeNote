"""
Seeds Redis with 3 demo clients, their therapist context, check-in history, and check-in config.

Run:  python seed_demo.py
Requires: Redis running on localhost:6379 and .env with ANTHROPIC_API_KEY
"""
import asyncio
import json
import random
from datetime import datetime, timedelta
from services.redis_client import (
    save_therapist_context, save_checkin, save_checkin_config, register_client
)

THERAPIST_ID = "therapist-001"

# ──────────────────────────────────────────────────────────────────────────────
# CLIENT 1: Alex — GAD, social anxiety, high-functioning
# ──────────────────────────────────────────────────────────────────────────────
ALEX = {
    "id": "client-001",
    "name": "Alex M.",
    "context": {
        "therapist_id": THERAPIST_ID,
        "client_id": "client-001",
        "client_name": "Alex M.",
        "treatment_goals": [
            "Reduce anxiety in workplace performance settings",
            "Build consistent wind-down sleep routine",
            "Develop self-compassion when receiving feedback",
            "Improve emotion regulation during conflict",
        ],
        "diagnoses": ["Generalized Anxiety Disorder", "Major Depressive Disorder (mild, remission)"],
        "medications": ["Sertraline 50mg"],
        "triggers": ["performance reviews", "crowded social events", "sleep deprivation", "ambiguous feedback from manager"],
        "strengths": ["highly self-aware", "motivated", "strong support network", "creative problem-solver", "humor"],
        "notes": (
            "Alex responds very well to CBT cognitive reframing. Tends toward catastrophizing on low-sleep days. "
            "Has made great progress identifying the anxiety spiral early. Currently working on the 'good enough' concept "
            "to combat perfectionism. Check in on sleep hygiene each session — this is the biggest mood lever."
        ),
        "last_session_date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
        "last_session_summary": (
            "Discussed upcoming performance review anxiety. Practiced cognitive reframing of 'my boss thinks I'm failing' → "
            "'my boss is giving me information to grow.' Alex committed to a 10pm wind-down routine this week. "
            "Ended session feeling more grounded — Alex mentioned the journaling has been helping."
        ),
    },
    "checkin_config": {
        "sliders": [
            {"key": "anxiety", "label": "Anxiety",  "color": "#e74c3c"},
            {"key": "energy",  "label": "Energy",   "color": "#2ecc71"},
        ],
        "button_groups": [
            {
                "key": "grapes",
                "label": "GRAPES — what did you do today?",
                "multi": True,
                "items": ["Grateful", "Relax", "Accomplish", "Pleasure", "Exercise", "Social"],
            },
            {
                "key": "self_care",
                "label": "Self-care",
                "multi": True,
                "items": ["Showered", "Ate meals", "Took medication", "Got outside", "Slept well"],
            },
        ],
    },
    "journals": [
        "Had a tough meeting today. Boss gave feedback and I kept catastrophizing even though it was mostly positive. Tried to notice the spiral early and breathe through it.",
        "Slept really well for the first time in weeks — felt so much better all day. Went for a walk at lunch.",
        "Anxious about a presentation next week. Can't stop thinking about blanking. Writing it out helped a little.",
        "Pretty neutral day. Nothing bad happened but I felt kind of flat. Not sure why.",
        "Had coffee with a friend and it was so nice. Laughed a lot. Good reminder that connection helps.",
        "Overwhelmed with work. Keep procrastinating because starting feels impossible.",
        "Managed to get through the presentation! People said really nice things. Heart was racing the whole time but I did it.",
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# CLIENT 2: Jordan — Depression, uses GRAPES framework heavily
# ──────────────────────────────────────────────────────────────────────────────
JORDAN = {
    "id": "client-002",
    "name": "Jordan R.",
    "context": {
        "therapist_id": THERAPIST_ID,
        "client_id": "client-002",
        "client_name": "Jordan R.",
        "treatment_goals": [
            "Rebuild daily structure and routine",
            "Use GRAPES framework daily to counteract depression",
            "Re-engage with hobbies (art, cooking)",
            "Reduce isolation — social contact at least 3x/week",
        ],
        "diagnoses": ["Major Depressive Disorder (moderate)"],
        "medications": ["Bupropion 150mg XL", "Vitamin D supplement"],
        "triggers": ["prolonged isolation", "canceling plans", "social media comparison", "rainy stretches"],
        "strengths": ["creative and artistic", "deep empathy", "thoughtful self-reflection", "strong when connected to purpose"],
        "notes": (
            "Jordan does best when they have small, achievable daily goals. The GRAPES framework has been transformative — "
            "we track it every session. Isolation is the biggest warning sign; when Jordan stops reaching out, mood drops fast. "
            "Encourage any creative activity as an 'accomplish' win. Watch for 'depression math' (minimizing small wins)."
        ),
        "last_session_date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"),
        "last_session_summary": (
            "Jordan completed GRAPES 5 of 7 days this week — best streak in months! Made art twice. "
            "Still struggling with mornings; we agreed to keep the bar very low (get dressed = win). "
            "Processed a difficult interaction with a family member. Jordan showed good insight into the pattern."
        ),
    },
    "checkin_config": {
        "sliders": [
            {"key": "depression", "label": "Depression",  "color": "#9b59b6"},
            {"key": "motivation", "label": "Motivation",  "color": "#3498db"},
        ],
        "button_groups": [
            {
                "key": "grapes",
                "label": "GRAPES — check off what you did today",
                "multi": True,
                "items": ["Grateful", "Relax", "Accomplish", "Pleasure", "Exercise", "Social"],
            },
            {
                "key": "basics",
                "label": "Daily basics",
                "multi": True,
                "items": ["Got dressed", "Ate a meal", "Went outside", "Took medication", "Made art/created something"],
            },
            {
                "key": "connections",
                "label": "Connected with someone?",
                "multi": True,
                "items": ["Texted a friend", "Called someone", "Saw someone in person", "Online community"],
            },
        ],
    },
    "journals": [
        "Did GRAPES today: grateful for the sun, made tea to relax, finished a small sketch (accomplish!), listened to music, short walk, texted Maya. Feeling okay.",
        "Really hard morning. Didn't get up until noon. Ate cereal. That's all I could manage. Trying not to judge myself for it.",
        "Made a full meal for the first time in a while. Mac and cheese from scratch. It felt huge and small at the same time.",
        "Canceled plans with a friend again. I know it makes things worse but I just couldn't. Tomorrow I'll try.",
        "Went to a coffee shop to work. Being around people even without talking helped more than I expected.",
        None,
        "Three GRAPES days in a row. I'm going to keep going.",
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# CLIENT 3: Sam — PTSD recovery, grounding focus
# ──────────────────────────────────────────────────────────────────────────────
SAM = {
    "id": "client-003",
    "name": "Sam T.",
    "context": {
        "therapist_id": THERAPIST_ID,
        "client_id": "client-003",
        "client_name": "Sam T.",
        "treatment_goals": [
            "Build safety and stability before deeper trauma processing",
            "Develop grounding toolkit for flashbacks and hypervigilance",
            "Establish consistent sleep and body regulation practices",
            "Gradually re-engage with safe social environments",
        ],
        "diagnoses": ["Post-Traumatic Stress Disorder", "Insomnia (trauma-related)"],
        "medications": ["Prazosin 1mg (nightmares)", "PRN Hydroxyzine for acute anxiety"],
        "triggers": [
            "loud sudden noises", "crowded public transport",
            "certain smells (smoke)", "being physically cornered or blocked"
        ],
        "strengths": [
            "enormous resilience", "protective instinct for others",
            "dry humor as coping", "excellent at grounding exercises once started"
        ],
        "notes": (
            "Sam is in stabilization phase. We are NOT doing trauma processing yet — focus is safety, grounding, and window of tolerance. "
            "The 5-4-3-2-1 grounding exercise works very well. Body scan before sleep has helped with nightmares. "
            "Sam often minimizes symptoms ('I'm fine') — check the body signals, not just what they say. "
            "Night check-ins are important; mornings after nightmares are the most vulnerable time."
        ),
        "last_session_date": (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d"),
        "last_session_summary": (
            "Sam had two nightmare-free nights this week — a significant milestone. Practiced the body scan together in session. "
            "Discussed a triggering moment on the subway; Sam used the 5-4-3-2-1 technique and stayed regulated. "
            "Expressed cautious pride in that. Next session: introduce 'safe place' visualization."
        ),
    },
    "checkin_config": {
        "sliders": [
            {"key": "safety",  "label": "Feeling safe",     "color": "#2ecc71"},
            {"key": "anxiety", "label": "Anxiety / on-edge", "color": "#e74c3c"},
        ],
        "button_groups": [
            {
                "key": "grounding",
                "label": "Grounding practices used today",
                "multi": True,
                "items": ["5-4-3-2-1 senses", "Box breathing", "Body scan", "Cold water", "Safe place visualization", "Walked outside"],
            },
            {
                "key": "sleep",
                "label": "Last night's sleep",
                "multi": True,
                "items": ["Slept through", "Woke up once", "Nightmares", "Couldn't fall asleep", "Took medication"],
            },
            {
                "key": "body",
                "label": "Body today",
                "multi": True,
                "items": ["Ate meals", "Drank water", "Moved my body", "Tension / pain", "Felt calm in body"],
            },
        ],
    },
    "journals": [
        "Used box breathing on the subway today when it got crowded. It actually worked. Felt shaky after but I stayed.",
        "Bad night. Nightmare about the accident. Took my medication and did the body scan like we practiced. Got back to sleep eventually.",
        "Two nights in a row with no nightmares. I almost don't trust it. But I'll take it.",
        "Crowded store today — walked out before I needed to. That felt like the right call, not a failure.",
        "Tried the safe place visualization before bed. Keep seeing the ocean. It helps.",
        None,
        "Told my sister a little bit about what I've been going through. She was kind. Didn't expect that.",
    ],
}


async def seed_client(client_data: dict):
    cid = client_data["id"]
    name = client_data["name"]

    print(f"\n── Seeding {name} ({cid}) ──")

    # Register client under therapist
    await register_client(cid, name, THERAPIST_ID)
    print(f"  ✓ Registered client")

    # Therapist context
    await save_therapist_context(client_data["context"])
    print(f"  ✓ Saved therapist context")

    # Check-in config
    await save_checkin_config(cid, client_data["checkin_config"])
    print(f"  ✓ Saved check-in config")

    # 7 days of check-ins
    moods = [3, 4, 2, 4, 5, 3, 4]  # varied but trending okay
    for i, (mood, journal) in enumerate(zip(moods, client_data["journals"])):
        sliders = {}
        for s in client_data["checkin_config"]["sliders"]:
            sliders[s["key"]] = random.randint(3, 8)

        buttons = {}
        for g in client_data["checkin_config"]["button_groups"]:
            all_items = g["items"]
            n = random.randint(1, min(4, len(all_items)))
            buttons[g["key"]] = random.sample(all_items, n)

        checkin = {
            "client_id": cid,
            "mood_score": mood,
            "mood_label": ["","Struggling","Difficult","Okay","Good","Great"][mood],
            "slider_values": sliders,
            "button_selections": buttons,
            "journal_entry": journal,
        }
        checkin_id = await save_checkin(checkin)
        print(f"  ✓ Day -{7-i}: mood={mood}, checkin={checkin_id[:8]}…")


async def main():
    from dotenv import load_dotenv
    load_dotenv()

    print("🌱 BridgeNote Demo Seed")
    print("=" * 40)

    for client in [ALEX, JORDAN, SAM]:
        await seed_client(client)

    print("\n✅ Done! Start the backend (uvicorn main:app --reload) and frontend (npm start) to explore the demo.")
    print("\nDemo clients:")
    print("  client-001 — Alex M.   (GAD, social anxiety)")
    print("  client-002 — Jordan R. (Depression, GRAPES focus)")
    print("  client-003 — Sam T.    (PTSD recovery)")
    print("\nTherapist ID: therapist-001")


if __name__ == "__main__":
    asyncio.run(main())
