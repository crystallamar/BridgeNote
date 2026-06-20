"""
Run this once to seed Redis with demo therapist context and check-ins:
  python seed_demo.py
"""
import asyncio
import json
from datetime import datetime, timedelta
import random
from services.redis_client import save_therapist_context, save_checkin

THERAPIST_CONTEXT = {
    "therapist_id": "therapist-001",
    "client_id": "client-001",
    "client_name": "Alex",
    "treatment_goals": [
        "Reduce social anxiety in workplace settings",
        "Build consistent sleep routine",
        "Develop self-compassion practices",
        "Improve emotion regulation during conflict",
    ],
    "diagnoses": ["Generalized Anxiety Disorder", "Major Depressive Disorder (mild, remission)"],
    "medications": ["Sertraline 50mg"],
    "triggers": ["performance reviews", "crowded social events", "sleep deprivation"],
    "strengths": ["highly self-aware", "motivated", "strong support network", "creative problem solver"],
    "notes": "Alex responds well to CBT techniques and journaling. Avoids avoidance coping. Check in on sleep hygiene.",
    "last_session_date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
    "last_session_summary": "Discussed upcoming performance review anxiety. Practiced cognitive reframing. Alex committed to a wind-down routine by 10pm. Good session — Alex was engaged and left with actionable steps.",
}

SAMPLE_JOURNALS = [
    "Had a tough meeting today. My boss gave feedback and I kept catastrophizing even though it was mostly positive. Tried to notice the spiral and breathe through it.",
    "Slept really well last night for the first time in weeks. Felt so much better today. Went for a walk at lunch which helped too.",
    "Feeling anxious about a presentation next week. Can't stop thinking about what if I blank. Tried writing it out which helped a little.",
    "Pretty neutral day. Nothing bad happened but I felt kind of flat. Not sure why.",
    "Had coffee with a friend and it was actually really nice. Laughed a lot. Good reminder that connection helps.",
    "Overwhelmed with work. Keep procrastinating because starting feels impossible. Need to break things down.",
    "Managed to get through the presentation! People said nice things. Still felt my heart racing but I did it.",
]


async def seed():
    from dotenv import load_dotenv
    load_dotenv()

    print("Seeding therapist context…")
    await save_therapist_context(THERAPIST_CONTEXT)

    print("Seeding 7 days of check-ins…")
    for i in range(7, 0, -1):
        mood = random.randint(4, 8)
        checkin = {
            "client_id": "client-001",
            "mood_score": mood,
            "mood_label": ["","Terrible","Bad","Poor","Low","Neutral","Okay","Good","Great","Excellent","Amazing"][mood],
            "anxiety_level": random.randint(3, 7),
            "energy_level": random.randint(4, 8),
            "sleep_hours": round(random.uniform(5.5, 8.5), 1),
            "journal_entry": random.choice(SAMPLE_JOURNALS),
        }
        # Backdate artificially (save normally, timestamp will be now, but that's fine for demo)
        cid = await save_checkin(checkin)
        print(f"  Day -{i}: checkin {cid[:8]}… mood={mood}")

    print("Done. Start the backend and frontend to see the demo.")


if __name__ == "__main__":
    asyncio.run(seed())
