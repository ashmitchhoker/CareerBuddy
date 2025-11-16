import json

# --- Load your RIASEC question mapping ---
with open("riasec_mapping.json", "r") as f:
    QUESTIONS = json.load(f)

# # --- Configurable weights ---
# WEIGHT_INTEREST = 1.0
# WEIGHT_APTITUDE = 1.2


def score_riasec(responses):
    """
    responses: list of Likert-scale values (1–5), in same order as QUESTIONS
    returns: dict of normalized RIASEC scores + top code
    """
    assert len(responses) == len(QUESTIONS), "Response count mismatch"

    scores = {k: 0.0 for k in "RIASEC"}
    counts = {k: 0 for k in "RIASEC"}

    for q, score in zip(QUESTIONS, responses):
        t = q["riasec"]
        mult = -1 if q["negative"] else 1
        # w = WEIGHT_APTITUDE if q["dimension"] == "aptitude" else WEIGHT_INTEREST
        scores[t] += mult * score 
        counts[t] += 1

    # Average per RIASEC
    for t in scores:
        scores[t] = scores[t] / counts[t] if counts[t] > 0 else 0

    # Normalize 0–100
    min_score = min(scores.values())
    max_score = max(scores.values())
    if max_score != min_score:
        for t in scores:
            scores[t] = 100 * (scores[t] - min_score) / (max_score - min_score)
    else:
        for t in scores:
            scores[t] = 50  # fallback if all equal

    # Sort and label
    sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_3 = "".join([x[0] for x in sorted_types[:3]])

    return {
        "scores": scores,
        "top_3": top_3,
        "ordered": sorted_types
    }


# --- Example ---
if __name__ == "__main__":
    # Dummy user answers (Likert 1–5)
    user_responses = [
        4, 2, 5, 1, 3, 5, 4, 2, 4, 3,
        2, 5, 3, 5, 5, 4, 4, 5, 2, 2,
        4, 1, 5, 5, 4, 5, 3, 4, 5, 4,
        5, 4, 5
    ]

    result = score_riasec(user_responses)
    print("RIASEC Scores:", result["scores"])
    print("Top 3 Code:", result["top_3"])

    # find the occurence for each letter in the questions mapping
    for letter in "RIASEC":
        count = sum(1 for q in QUESTIONS if q["riasec"] == letter)
        print(f"Count of {letter} questions: {count}")
