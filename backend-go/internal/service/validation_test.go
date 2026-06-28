package service

import (
	"strings"
	"testing"
)

func TestValidateSlug(t *testing.T) {
	tests := []struct {
		name    string
		slug    string
		wantErr bool
	}{
		{"valid", "building-with-ai", false},
		{"empty", "", true},
		{"uppercase", "Building-With-AI", true},
		{"spaces", "building with ai", true},
		{"leading hyphen", "-building", true},
		{"trailing hyphen", "building-", true},
		{"double hyphen", "building--ai", true},
		{"too long", strings.Repeat("a", 121), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSlug(tt.slug)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateSlug() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTitleAndStatus(t *testing.T) {
	if err := validateTitle("  A title  "); err != nil {
		t.Fatalf("validateTitle valid: %v", err)
	}
	if err := validateTitle("   "); err == nil {
		t.Fatal("validateTitle empty whitespace: expected error")
	}
	if err := validateTitle(strings.Repeat("a", 201)); err == nil {
		t.Fatal("validateTitle too long: expected error")
	}

	for _, status := range []string{"draft", "beta", "published"} {
		if err := validateStatus(status); err != nil {
			t.Fatalf("validateStatus(%q): %v", status, err)
		}
	}
	if err := validateStatus("archived"); err == nil {
		t.Fatal("validateStatus unknown: expected error")
	}
}

func TestNormalizeYouTubeEmbedURL(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    string
		wantErr bool
	}{
		{"www embed", "https://www.youtube.com/embed/VIDEO_ID", "https://www.youtube.com/embed/VIDEO_ID", false},
		{"bare embed", "https://youtube.com/embed/VIDEO_ID", "https://www.youtube.com/embed/VIDEO_ID", false},
		{"mobile watch", "https://m.youtube.com/watch?v=VIDEO_ID", "https://www.youtube.com/embed/VIDEO_ID", false},
		{"short", "https://youtu.be/VIDEO_ID", "https://www.youtube.com/embed/VIDEO_ID", false},
		{"non https", "http://www.youtube.com/embed/VIDEO_ID", "", true},
		{"untrusted host", "https://evil.example/embed/VIDEO_ID", "", true},
		{"iframe", `<iframe src="https://www.youtube.com/embed/VIDEO_ID"></iframe>`, "", true},
		{"missing id", "https://www.youtube.com/embed/", "", true},
		{"invalid chars", "https://www.youtube.com/embed/VIDEO!ID", "", true},
		{"query heavy embed", "https://www.youtube.com/embed/VIDEO_ID?autoplay=1", "https://www.youtube.com/embed/VIDEO_ID", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeYouTubeEmbedURL(tt.raw)
			if (err != nil) != tt.wantErr {
				t.Fatalf("normalizeYouTubeEmbedURL() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("normalizeYouTubeEmbedURL() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestValidateSequencePoint(t *testing.T) {
	tests := []struct {
		name      string
		title     string
		timestamp int
		duration  int
		wantErr   bool
	}{
		{"zero", "Intro", 0, 100, false},
		{"equal duration", "End", 100, 100, false},
		{"negative", "Bad", -1, 100, true},
		{"greater than duration", "Bad", 101, 100, true},
		{"empty title", " ", 0, 100, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSequencePoint(tt.title, tt.timestamp, tt.duration)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateSequencePoint() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
