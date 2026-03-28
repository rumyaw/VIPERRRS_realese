FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod tidy

COPY . .
# Не фиксировать GOARCH=amd64: на Apple Silicon иначе получается amd64-бинарник под QEMU,
# что даёт SIGSEGV в netpoll при DNS/PostgreSQL. Сборка под архитектуру образа (BuildKit).
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/tramplin-api ./cmd/api

FROM alpine:3.20

# wget нужен для healthcheck в docker-compose (в базовом Alpine его нет)
RUN apk add --no-cache wget

WORKDIR /srv
RUN adduser -D -g '' appuser

COPY --from=builder /out/tramplin-api /usr/local/bin/tramplin-api

EXPOSE 8080
USER appuser
ENTRYPOINT ["/usr/local/bin/tramplin-api"]
