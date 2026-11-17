# =============================================================================
#  Backend — Spring Boot 3 / Java 21
#  Coolify: Base Directory = /backend  ·  Build Pack = Dockerfile  ·  Puerto 8080
#  Toda la configuración llega por variables de entorno (ver ../.env.example).
# =============================================================================

# ---- Etapa 1: compilar ------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
# Los tests se corren aparte (carpeta testing/); aquí solo se empaqueta.
RUN mvn -q -B package -DskipTests

# ---- Etapa 2: ejecutar ------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --create-home appuser
COPY --from=build /app/target/*.jar app.jar
USER appuser
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fs http://localhost:${PORT}/api/v1/estado || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
