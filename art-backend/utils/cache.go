package utils

import (
	"art/database"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func InvalidateCache(c *gin.Context, pattern ...string) {
	redisClient, err := database.GetRedis()
	if err != nil || redisClient == nil {
		log.Warn().Err(err).Msg("Redis not available, skipping cache invalidation")
		return
	}

	ctx := c.Request.Context()

	for _, pattern := range pattern {
		cursor := uint64(0)
		for {
			keys, nextCursor, err := redisClient.Scan(ctx, cursor, pattern, 1000).Result()
			if err != nil {
				log.Error().Err(err).Msg("Failed to scan activities cache keys")
				break
			}
			if len(keys) > 0 {
				if err := redisClient.Del(ctx, keys...).Err(); err != nil {
					log.Error().Err(err).Msg("Failed to delete activities cache keys")
				} else {
					log.Info().Str("pattern", pattern).Int("keys_deleted", len(keys)).Msg("Cache keys deleted")
				}
			}
			cursor = nextCursor
			if cursor == 0 {
				break
			}
		}
	}
	log.Info().Msgf("Cache deleted for %v", pattern)
}
