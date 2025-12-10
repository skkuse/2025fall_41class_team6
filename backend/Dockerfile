# --------------------------------------------------------
# 1. 빌드 단계 (일반 JDK 이미지 사용 -> 권한 문제 해결!)
# --------------------------------------------------------
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# 파일 복사
COPY . .

# [중요] 윈도우에서 올리면 gradlew 실행 권한이 없을 수 있음 -> 강제 부여
RUN chmod +x gradlew

# [핵심] 1. ./gradlew 사용 (내 컴퓨터랑 똑같은 환경)
# [핵심] 2. 메모리를 256m로 더 줄임 (Render가 숨 쉴 공간 확보)
RUN ./gradlew bootJar -x test --no-daemon -Dorg.gradle.jvmargs="-Xmx256m"

# --------------------------------------------------------
# 2. 실행 단계 (가벼운 Alpine 리눅스 사용)
# --------------------------------------------------------
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]