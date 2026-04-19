#!/bin/bash
# Seed 10 UPSC questions across different topics.
# Requires ADMIN_EMAIL and ADMIN_PASSWORD to be exported in the environment,
# matching an existing superadmin/maker account.
BASE="${API_BASE:-http://localhost:8000/api}"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: export ADMIN_EMAIL and ADMIN_PASSWORD before running this script"
  exit 1
fi

# 1. Login with existing admin
TOKEN=$(curl -s -X POST "$BASE/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | python -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get admin token"
  exit 1
fi
echo "Got admin token"

AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

# Helper: create + publish
create_and_publish() {
  local data="$1"
  local id=$(curl -s -X POST "$BASE/admin/questions" -H "$CT" -H "$AUTH" -d "$data" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$id" ] && [ "$id" != "" ]; then
    curl -s -X PUT "$BASE/admin/questions/$id/publish" -H "$AUTH" > /dev/null
    echo "Created & published question $id"
  else
    echo "FAILED to create question"
  fi
}

# Q1 - Polity
create_and_publish '{
  "question_text":"Which of the following is NOT a feature of the Indian Constitution?",
  "statements":["1. Federal structure with unitary bias","2. Presidential form of government","3. Independent judiciary","4. Fundamental Rights"],
  "option_a":"1 and 3","option_b":"2 only","option_c":"3 and 4","option_d":"1, 2 and 4",
  "correct_option":"B",
  "rationale":"India follows a Parliamentary form of government, not Presidential. The other features are correctly attributed to the Indian Constitution.",
  "topic_slug":"polity","difficulty":"easy","source_label":"Practice"
}'

# Q2 - History
create_and_publish '{
  "question_text":"The Revolt of 1857 started from which of the following places?",
  "statements":[],
  "option_a":"Delhi","option_b":"Kanpur","option_c":"Meerut","option_d":"Lucknow",
  "correct_option":"C",
  "rationale":"The Revolt of 1857 began on 10 May 1857 at Meerut when Indian sepoys refused to use the new Enfield rifle cartridges.",
  "topic_slug":"history","difficulty":"easy","source_label":"Practice"
}'

# Q3 - Geography
create_and_publish '{
  "question_text":"Which of the following rivers does NOT originate in Indian territory?",
  "statements":[],
  "option_a":"Brahmaputra","option_b":"Godavari","option_c":"Krishna","option_d":"Narmada",
  "correct_option":"A",
  "rationale":"The Brahmaputra originates near Lake Mansarovar in Tibet (China) as Tsangpo. Godavari, Krishna, and Narmada all originate within India.",
  "topic_slug":"geography","difficulty":"medium","source_label":"Practice"
}'

# Q4 - Economy
create_and_publish '{
  "question_text":"Which body recommends the distribution of taxes between the Centre and the States?",
  "statements":[],
  "option_a":"Planning Commission","option_b":"Finance Commission","option_c":"NITI Aayog","option_d":"National Development Council",
  "correct_option":"B",
  "rationale":"The Finance Commission (Article 280) recommends the distribution of net proceeds of taxes between the Centre and the States.",
  "topic_slug":"economy","difficulty":"easy","source_label":"Practice"
}'

# Q5 - Environment
create_and_publish '{
  "question_text":"Consider the following statements about the Western Ghats:",
  "statements":["1. They are older than the Himalayas","2. They are a UNESCO World Heritage Site","3. They receive rainfall mainly from the South-West monsoon"],
  "option_a":"1 and 2 only","option_b":"2 and 3 only","option_c":"1 and 3 only","option_d":"1, 2 and 3",
  "correct_option":"D",
  "rationale":"All three statements are correct. The Western Ghats are older than the Himalayas, designated as a UNESCO World Heritage Site in 2012, and receive heavy rainfall from the South-West monsoon.",
  "topic_slug":"environment","difficulty":"medium","source_label":"Practice"
}'

# Q6 - Science & Tech
create_and_publish '{
  "question_text":"ISRO'\''s Chandrayaan-3 mission successfully landed on which part of the Moon?",
  "statements":[],
  "option_a":"Near the lunar equator","option_b":"Near the lunar north pole","option_c":"Near the lunar south pole","option_d":"On the far side of the Moon",
  "correct_option":"C",
  "rationale":"Chandrayaan-3 successfully landed near the lunar south pole on August 23, 2023, making India the first country to land near the Moon'\''s south polar region.",
  "topic_slug":"science-tech","difficulty":"easy","source_label":"Practice"
}'

# Q7 - International Relations
create_and_publish '{
  "question_text":"The Quad grouping consists of which of the following countries?",
  "statements":[],
  "option_a":"India, USA, UK, Australia","option_b":"India, USA, Japan, Australia","option_c":"India, USA, Japan, France","option_d":"India, USA, Australia, Canada",
  "correct_option":"B",
  "rationale":"The Quad (Quadrilateral Security Dialogue) comprises India, the United States, Japan, and Australia.",
  "topic_slug":"ir","difficulty":"easy","source_label":"Practice"
}'

# Q8 - Art & Culture
create_and_publish '{
  "question_text":"The classical dance form Bharatanatyam originated in which state?",
  "statements":[],
  "option_a":"Kerala","option_b":"Karnataka","option_c":"Tamil Nadu","option_d":"Andhra Pradesh",
  "correct_option":"C",
  "rationale":"Bharatanatyam is one of the oldest classical dance forms of India, originating in Tamil Nadu. It was traditionally performed in temples.",
  "topic_slug":"art-culture","difficulty":"easy","source_label":"Practice"
}'

# Q9 - Government Schemes
create_and_publish '{
  "question_text":"Under the Ayushman Bharat PM-JAY scheme, what is the health cover provided per family per year?",
  "statements":[],
  "option_a":"Rs 1 lakh","option_b":"Rs 3 lakh","option_c":"Rs 5 lakh","option_d":"Rs 10 lakh",
  "correct_option":"C",
  "rationale":"Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY) provides health insurance cover of Rs 5 lakh per family per year for secondary and tertiary care hospitalization.",
  "topic_slug":"schemes","difficulty":"easy","source_label":"Practice"
}'

# Q10 - Polity (Hard)
create_and_publish '{
  "question_text":"Consider the following statements about the 42nd Constitutional Amendment Act:",
  "statements":["1. It added the words Socialist, Secular, and Integrity to the Preamble","2. It transferred five subjects from the State List to the Concurrent List","3. It added Fundamental Duties to the Constitution","4. It was passed during the National Emergency of 1975-77"],
  "option_a":"1, 2 and 3 only","option_b":"1, 3 and 4 only","option_c":"2, 3 and 4 only","option_d":"1, 2, 3 and 4",
  "correct_option":"D",
  "rationale":"All four statements are correct. The 42nd Amendment (1976), often called the Mini Constitution, made all these changes during the Emergency period under Indira Gandhi'\''s government.",
  "topic_slug":"polity","difficulty":"hard","source_label":"Practice"
}'

echo ""
echo "Done! 10 questions seeded and published."
