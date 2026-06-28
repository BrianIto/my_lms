package service

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

// ErrNotFound signals a missing parent/target row; handlers map it to 404.
var ErrNotFound = errors.New("not found")

// ErrConflict signals a uniqueness conflict (e.g. duplicate slug); handlers map it to 409.
var ErrConflict = errors.New("conflict")

// ValidationError is a client-facing validation failure; handlers map it to 400.
type ValidationError struct{ Msg string }

func (e ValidationError) Error() string { return e.Msg }

func invalid(format string, args ...any) error {
	return ValidationError{Msg: fmt.Sprintf(format, args...)}
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// validateSlug ensures a lowercase URL-safe slug.
func validateSlug(slug string) error {
	if slug == "" {
		return invalid("slug is required")
	}
	if len(slug) > 120 {
		return invalid("slug is too long")
	}
	if !slugPattern.MatchString(slug) {
		return invalid("slug must be lowercase letters, numbers, and single hyphens")
	}
	return nil
}

// validateTitle ensures a non-empty, bounded title.
func validateTitle(title string) error {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return invalid("title is required")
	}
	if len(trimmed) > 200 {
		return invalid("title is too long")
	}
	return nil
}

// validateStatus ensures the status is a known course status.
func validateStatus(status string) error {
	switch CourseStatus(status) {
	case CourseStatusDraft, CourseStatusBeta, CourseStatusPublished:
		return nil
	default:
		return invalid("status must be one of draft, beta, published")
	}
}

var youtubeVideoID = regexp.MustCompile(`^[A-Za-z0-9_-]{6,20}$`)

// normalizeYouTubeEmbedURL validates and normalizes a trusted YouTube embed URL.
// It accepts canonical embed URLs, youtu.be short links, and watch URLs, and
// rejects arbitrary hosts, non-HTTPS URLs, and anything that is not a plain video reference.
func normalizeYouTubeEmbedURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", invalid("youtube_embed_url is required")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return "", invalid("youtube_embed_url is not a valid URL")
	}
	if parsed.Scheme != "https" {
		return "", invalid("youtube_embed_url must use https")
	}

	host := strings.ToLower(parsed.Host)
	var videoID string
	switch host {
	case "www.youtube.com", "youtube.com", "m.youtube.com":
		if rest, ok := strings.CutPrefix(parsed.Path, "/embed/"); ok {
			videoID = rest
		} else if parsed.Path == "/watch" {
			videoID = parsed.Query().Get("v")
		} else {
			return "", invalid("youtube_embed_url must be an embed or watch URL")
		}
	case "youtu.be":
		videoID = strings.TrimPrefix(parsed.Path, "/")
	default:
		return "", invalid("youtube_embed_url host is not a trusted YouTube domain")
	}

	videoID = strings.Trim(videoID, "/")
	if !youtubeVideoID.MatchString(videoID) {
		return "", invalid("youtube_embed_url does not contain a valid video id")
	}
	return "https://www.youtube.com/embed/" + videoID, nil
}

// validateSequencePoint validates a single bookmark against the lesson duration.
func validateSequencePoint(title string, timestampSeconds, durationSeconds int) error {
	if strings.TrimSpace(title) == "" {
		return invalid("lesson sequence point title is required")
	}
	if timestampSeconds < 0 {
		return invalid("timestamp_seconds must be >= 0")
	}
	if durationSeconds > 0 && timestampSeconds > durationSeconds {
		return invalid("timestamp_seconds must be within the lesson duration")
	}
	return nil
}
