package utils

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

func ParseTemplateTime(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, fmt.Errorf("empty time")
	}

	// Если это просто HH:MM или HH:MM:SS
	if len(s) <= 8 && (strings.Count(s, ":") >= 1) {
		parts := strings.Split(s, ":")
		if len(parts) < 2 {
			return time.Time{}, fmt.Errorf("invalid short time")
		}
		h, err := strconv.Atoi(parts[0])
		if err != nil {
			return time.Time{}, err
		}
		m, err := strconv.Atoi(parts[1])
		if err != nil {
			return time.Time{}, err
		}
		// используем год 1, месяц 1, день 1 (лично я рекомендую 0001-01-01)
		return time.Date(1, 1, 1, h, m, 0, 0, time.UTC), nil
	}

	// пробуем парсить RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}

	// ещё попытка common formats
	layouts := []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04:05Z07:00",
		"15:04:05",
		"15:04",
	}
	for _, l := range layouts {
		if t, err := time.ParseInLocation(l, s, time.UTC); err == nil {
			return t.UTC(), nil
		}
	}

	return time.Time{}, fmt.Errorf("unsupported time format: %s", s)
}

// CombineDateAndTemplateTime возвращает time в UTC:
// targetDate — реальная дата (в локали/UTC), tmplTime — шаблонное время (год=1...).
func CombineDateAndTemplateTime(targetDate time.Time, tmplTime time.Time) time.Time {
	year, month, day := targetDate.Date()
	return time.Date(year, month, day, tmplTime.Hour(), tmplTime.Minute(), 0, 0, time.UTC)
}
