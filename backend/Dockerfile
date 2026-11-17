# =============================================================================
#  Clínica Oftalmológica Ojitos — imagen del backend (Spring Boot 3.4 + Java 21)
# =============================================================================
#  Construcción:
#      docker build -t clinica-ojitos-api ./backend
#  Ejecución:
#      docker run --env-file .env -p 8080:8080 clinica-ojitos-api
# =============================================================================

# --- Etapa 1: compilar el JAR con Maven ---------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build

# Primero solo el POM: la capa de dependencias se reutiliza si no cambia.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Etapa 2: imagen mínima de ejecución --------------------------------------
FROM eclipse-temurin:21-jre-alpine

# wget lo usa el HEALTHCHECK; tzdata permite respetar TZ.
RUN apk add --no-cache tzdata wget \
    && addgroup -S clinica \
    && adduser -S clinica -G clinica

WORKDIR /app
COPY --from=build /build/target/*.jar /app/app.jar
RUN chown -R clinica:clinica /app

USER clinica

ENV TZ=America/Lima \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -Dfile.encoding=UTF-8"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/api/v1/estado || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
