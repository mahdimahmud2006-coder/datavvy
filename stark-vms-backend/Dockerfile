FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar /app/app.jar
USER 10001:10001
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
