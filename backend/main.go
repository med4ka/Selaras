package main

import (
	"log"
	"time"

	"selaras/backend/config"
	"selaras/backend/database"
	"selaras/backend/handlers"
	"selaras/backend/middleware"
	"selaras/backend/repository"
	"selaras/backend/routes"
	"selaras/backend/service"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	if err := database.Seed(db); err != nil {
		log.Fatalf("Database seeding failed: %v", err)
	}

	app := fiber.New(fiber.Config{
		AppName: "Selaras POS API",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowHeaders:     "Origin, Content-Type, Accept",
		AllowCredentials: true,
	}))
	app.Use(logger.New())
	app.Use(recover.New())

	// Repositories
	userRepo := repository.NewUserRepository(db)
	catRepo := repository.NewCategoryRepository(db)
	prodRepo := repository.NewProductRepository(db)
	outletRepo := repository.NewOutletRepository(db)
	ledgerRepo := repository.NewStockLedgerRepository(db)
	stockRepo := repository.NewStockRepository(db)
	txRepo := repository.NewTransactionRepository(db)

	// Services
	authService := service.NewAuthService(userRepo, cfg)
	userService := service.NewUserService(userRepo)
	categoryService := service.NewCategoryService(catRepo)
	productService := service.NewProductService(prodRepo, catRepo)
	outletService := service.NewOutletService(outletRepo)
	transactionService := service.NewTransactionService(db, txRepo, prodRepo, ledgerRepo, stockRepo, cfg)
	stockService := service.NewStockService(db, prodRepo, ledgerRepo)
	reportService := service.NewReportService(repository.NewReportRepository(db))

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(authService, userService)
	categoryHandler := handlers.NewCategoryHandler(categoryService)
	productHandler := handlers.NewProductHandler(productService)
	outletHandler := handlers.NewOutletHandler(outletService)
	transactionHandler := handlers.NewTransactionHandler(transactionService)
	stockHandler := handlers.NewStockHandler(stockService)
	reportHandler := handlers.NewReportHandler(reportService)

	api := app.Group("/api")

	// Login: cookie-based auth (HttpOnly) + rate limiter (5 req/min per IP)
	api.Post("/auth/login", limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Terlalu banyak percobaan login, coba lagi nanti",
			})
		},
	}), authHandler.Login)
	api.Post("/auth/logout", authHandler.Logout)

	protected := api.Group("", middleware.Auth(cfg))
	{
		protected.Get("/me", userHandler.GetProfile)
		// Users — owner (full) / manager (kasir only, same outlet)
		protected.Get("/users", middleware.RequireRole("owner", "manager"), userHandler.List)
		protected.Post("/users/:id/restore", middleware.RequireRole("owner", "manager"), userHandler.Restore)
		protected.Post("/users", middleware.RequireRole("owner", "manager"), userHandler.Create)
		protected.Put("/users/:id", middleware.RequireRole("owner", "manager"), userHandler.Update)
		protected.Delete("/users/:id", middleware.RequireRole("owner", "manager"), userHandler.Deactivate)
		// Outlets — read (all authenticated), mutate (owner only)
		protected.Get("/outlets", outletHandler.List)
		protected.Get("/outlets/:id", outletHandler.GetByID)
		// Specific POST routes MUST come before generic param routes
		protected.Post("/outlets/:id/restore", middleware.RequireRole("owner"), outletHandler.Restore)
		protected.Post("/outlets", middleware.RequireRole("owner"), outletHandler.Create)
		protected.Put("/outlets/:id", middleware.RequireRole("owner"), outletHandler.Update)
		protected.Delete("/outlets/:id", middleware.RequireRole("owner"), outletHandler.Delete)

		// Categories — read (all roles), mutate (owner/manager only)
		protected.Get("/categories", categoryHandler.List)
		protected.Get("/categories/:id", categoryHandler.GetByID)
		protected.Post("/categories", middleware.RequireRole("owner", "manager"), categoryHandler.Create)
		protected.Put("/categories/:id", middleware.RequireRole("owner", "manager"), categoryHandler.Update)
		protected.Delete("/categories/:id", middleware.RequireRole("owner", "manager"), categoryHandler.Delete)

		// Products — read (all roles), mutate (owner/manager only)
		protected.Get("/products", productHandler.List)
		protected.Get("/products/:id", productHandler.GetByID)
		protected.Post("/products/:id/restore", middleware.RequireRole("owner", "manager"), productHandler.Restore)
		protected.Post("/products", middleware.RequireRole("owner", "manager"), productHandler.Create)
		protected.Put("/products/:id", middleware.RequireRole("owner", "manager"), productHandler.Update)
		protected.Delete("/products/:id", middleware.RequireRole("owner", "manager"), productHandler.Delete)

		protected.Get("/stocks", routes.ListStocks(db))
		protected.Post("/stocks/transfer", middleware.RequireRole("owner"), stockHandler.Transfer)
		protected.Post("/stocks/adjust", middleware.RequireRole("owner", "manager"), stockHandler.Adjust)

		// Transactions — create (all roles), list recent (owner/manager only)
		protected.Get("/transactions", middleware.RequireRole("owner", "manager"), transactionHandler.ListRecent)
		protected.Post("/transactions", transactionHandler.Create)

		// Reports — owner/manager only (read-only financial data)
		protected.Get("/reports/sales", middleware.RequireRole("owner", "manager"), reportHandler.GetSalesReport)
	}

	log.Printf("Selaras API running on port %s", cfg.ServerPort)
	log.Println("Registered routes:")
	for _, r := range app.GetRoutes() {
		if r.Method != "HEAD" && r.Method != "OPTIONS" {
			log.Printf("  %s %s", r.Method, r.Path)
		}
	}
	if err := app.Listen(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
