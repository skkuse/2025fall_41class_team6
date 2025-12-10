import json
import pymysql

# 1. DB 연결 설정 (본인 환경에 맞게 수정하세요)
db_config = {
    'host': 'localhost',      # 또는 DB IP 주소
    'user': 'root',           # DB 계정명
    'password': 'mariadb', # DB 비밀번호
    'db': 'swe_dating_db',     # 데이터베이스 이름
    'charset': 'utf8mb4'
}

# 2. JSON 파일 읽기
try:
    with open('src/main/resources/final_data_with_reviews.json', 'r', encoding='utf-8') as f:
        json_data = json.load(f)
        print(f"총 {len(json_data)}개의 데이터를 읽었습니다.")
except FileNotFoundError:
    print("JSON 파일을 찾을 수 없습니다. 파일 경로를 확인해주세요.")
    exit()

# 3. DB 연결 및 데이터 삽입
try:
    connection = pymysql.connect(**db_config)
    cursor = connection.cursor()

    # INSERT 쿼리 (description 제외, reviewSummary 포함)
    sql = """
          INSERT INTO places (
              name, category, address, review_summary,
              latitude, longitude, rating, image_urls, image_url,
              kakao_id, serial_number
          ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
              ON DUPLICATE KEY UPDATE
                                   name = VALUES(name),
                                   category = VALUES(category),
                                   review_summary = VALUES(review_summary),
                                   image_urls = VALUES(image_urls),
                                   image_url = VALUES(image_url),
                                   rating = VALUES(rating); \
          """
    # ON DUPLICATE KEY UPDATE: 이미 같은 kakao_id가 있으면 정보를 갱신합니다.

    # 4. 데이터 리스트 만들기 (일괄 삽입용)
    data_to_insert = []
    for item in json_data:
        # image_urls 리스트를 JSON 문자열로 변환 (MariaDB JSON 컬럼용)
        image_urls_json = json.dumps(item.get('imageUrls', []))

        # 튜플 형태로 데이터 정제
        row = (
            item.get('name'),
            item.get('category'),
            item.get('address'),
            item.get('reviewSummary', ''),  # 키가 없을 경우 빈 문자열
            item.get('latitude'),
            item.get('longitude'),
            item.get('rating'),
            image_urls_json,
            item.get('image_url'),
            item.get('kakao_id'),
            item.get('serial_number')
        )
        data_to_insert.append(row)

    # 5. executemany로 한 번에 실행 (속도 최적화)
    cursor.executemany(sql, data_to_insert)
    connection.commit()

    print(f"성공적으로 {cursor.rowcount}개의 데이터가 처리되었습니다.")

except Exception as e:
    print(f"에러 발생: {e}")
    connection.rollback()

finally:
    if 'connection' in locals():
        connection.close()
        print("DB 연결 종료")