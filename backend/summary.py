import json
import os
from openai import OpenAI

# ================= [설정 정보 입력] =================
# 1. OpenAI API 키 입력 (sk-... 로 시작하는 키)
OPENAI_API_KEY = "{openai.api.key}"

# 2. 파일 경로 설정
# 아까 만든(Cloudinary URL이 들어간) 파일 경로
INPUT_JSON_PATH = "final_data.json"
# 결과를 저장할 파일 경로
OUTPUT_JSON_PATH = "src/main/resources/final_data_with_reviews.json"
# ===================================================

client = OpenAI(api_key=OPENAI_API_KEY)

def generate_ai_summary(name, category, address):
    """
    OpenAI에게 장소 이름과 정보를 주고 한 줄 평을 부탁하는 함수
    """
    # 프롬프트: AI에게 역할을 부여하고, 짧고 매력적인 멘트를 요청
    prompt = f"""
    너는 데이트 코스 추천 앱의 에디터야.
    아래 장소에 대해 커플들이 데이트할 때 참고할만한 매력적인 한 줄 소개를 작성해줘.

    [장소 정보]
    - 이름: {name}
    - 카테고리: {category}
    - 주소: {address}

    [조건]
    1. 20자 내외로 짧고 임팩트 있게.
    2. "~하기 좋은 곳", "~한 분위기" 처럼 명사형이나 자연스러운 말투로 끝내줘.
    3. 정보가 부족해서 잘 모르겠으면 "연인과 함께하기 좋은 추천 데이트 명소"라고 써줘.
    4. 한국어로 작성해줘.
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini", # 가성비 좋고 빠른 모델
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=100
        )
        # 결과 텍스트 가져오기 (따옴표 제거)
        return completion.choices[0].message.content.strip().replace('"', '')

    except Exception as e:
        print(f"    ⚠️ OpenAI 호출 실패: {e}")
        return "데이트하기 좋은 분위기 있는 장소"

def process_enrichment():
    print("🚀 reviewSummary 생성 작업을 시작합니다...")

    # 1. 파일 읽기
    if not os.path.exists(INPUT_JSON_PATH):
        print(f"❌ 오류: 입력 파일({INPUT_JSON_PATH})이 없습니다.")
        return

    with open(INPUT_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total = len(data)
    updated_count = 0

    # 2. 데이터 순회하며 빈칸 채우기
    for idx, place in enumerate(data):
        name = place.get("name", "")
        # 이미 내용이 있으면 건너뛰고, 없거나 빈칸이면 생성
        current_summary = place.get("reviewSummary", "")

        if not current_summary: # 빈칸인 경우
            print(f"[{idx+1}/{total}] '{name}' 요약 생성 중...", end=" ")

            # AI 호출
            new_summary = generate_ai_summary(
                name,
                place.get("category", ""),
                place.get("address", "")
            )

            place["reviewSummary"] = new_summary
            print(f"✅ -> {new_summary}")
            updated_count += 1
        else:
            # 이미 있으면 패스
            # print(f"[{idx+1}/{total}] '{name}' (이미 있음)")
            pass

    # 3. 결과 저장
    with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("\n" + "="*50)
    print(f"🎉 작업 완료!")
    print(f"총 {total}개 중 {updated_count}개의 리뷰 요약 생성 완료.")
    print(f"저장된 파일: {OUTPUT_JSON_PATH}")
    print("="*50)
    print("이제 이 파일을 DB에 로드하시면 됩니다!")

if __name__ == "__main__":
    process_enrichment()