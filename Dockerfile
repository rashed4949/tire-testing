# ── Build stage ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy pom.xml first — Docker caches this layer, speeds up subsequent builds
COPY backend/pom.xml backend/pom.xml

# Pre-download Maven dependencies (cached unless pom.xml changes)
RUN cd backend && mvn dependency:go-offline -B

# Copy all source code
COPY backend/src backend/src

# Copy frontend BEFORE running maven package
# frontend-maven-plugin looks for workingDirectory = ../frontend (relative to backend/)
# So we need frontend/ one level up from backend/ → /workspace/frontend/
COPY frontend frontend

# Run mvn package — this:
#   1. Downloads Node v22.14.0 into backend/target/
#   2. Runs npm install in /workspace/frontend/
#   3. Runs npm run build → output to /workspace/frontend/dist/
#   4. Copies frontend/dist → backend/target/classes/static/
#   5. Packages everything into the fat JAR
RUN cd backend && mvn clean package -DskipTests

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S tire && adduser -S tire -G tire
USER tire

COPY --from=build /workspace/backend/target/*.jar app.jar

# Port 8080: main application (API + React static files)
# Port 8081: Spring Boot Actuator (metrics, health)
EXPOSE 8080 8081

ENTRYPOINT ["java", "-jar", "app.jar"]