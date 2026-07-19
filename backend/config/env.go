package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost              string
	DBPort              string
	DBUser              string
	DBPassword          string
	DBName              string
	DBSSLMode           string
	DBPoolMax           int
	DBPoolMin           int
	DBPoolMaxLifetime   time.Duration
	DBPoolMaxIdleTime   time.Duration
	JWTSecret           string
	JWTExpiry           time.Duration
	ServerPort          string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("[config] .env file tidak ditemukan atau gagal dibaca — menggunakan fallback value (termasuk JWT_SECRET default)")
	} else {
		log.Println("[config] .env berhasil dimuat")
	}

	cfg := &Config{
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DBUser:            getEnv("DB_USER", "selaras"),
		DBPassword:        getEnv("DB_PASSWORD", "selaras_secret"),
		DBName:            getEnv("DB_NAME", "selaras_db"),
		DBSSLMode:         getEnv("DB_SSLMODE", "disable"),
		DBPoolMax:         getEnvInt("DB_POOL_MAX", 25),
		DBPoolMin:         getEnvInt("DB_POOL_MIN", 5),
		DBPoolMaxLifetime: getEnvDuration("DB_POOL_MAX_LIFETIME", 30*time.Minute),
		DBPoolMaxIdleTime: getEnvDuration("DB_POOL_MAX_IDLE_TIME", 5*time.Minute),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-to-a-random-secret"),
		JWTExpiry:         getEnvDuration("JWT_EXPIRY", 24*time.Hour),
		ServerPort:        getEnv("SERVER_PORT", "8080"),
	}

	if cfg.JWTSecret == "change-me-to-a-random-secret" {
		log.Println("[config] PERINGATAN: JWT_SECRET masih menggunakan fallback default — set JWT_SECRET di .env untuk production")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
