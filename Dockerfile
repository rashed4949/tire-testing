# ── Build stage ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY backend/pom.xml backend/pom.xml


RUN cd backend && mvn dependency:go-offline -B --no-transfer-progress


COPY backend/src backend/src


COPY frontend frontend


RUN cd backend && mvn clean package -DskipTests -B --no-transfer-progress

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S tire && adduser -S tire -G tire
USER tire

COPY --from=build /workspace/backend/target/*.jar app.jar


EXPOSE 8080 8081

ENTRYPOINT ["java", "-jar", "app.jar"]