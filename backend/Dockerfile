# 1. 빌드 단계 (Gradle 8.5 & Java 17 사용)
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY . .
RUN gradle build -x test --no-daemon

# 2. 실행 단계 (Java 17 사용)
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]