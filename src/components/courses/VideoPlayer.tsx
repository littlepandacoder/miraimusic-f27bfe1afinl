import { Card } from "@/components/ui/card";

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    video_url: string;
    duration: number;
  };
}

const VideoPlayer = ({ video }: VideoPlayerProps) => {
  // Extract video ID from YouTube or Vimeo URL
  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)|youtu\.be\/([^?]+)/
    );
    if (youtubeMatch) {
      const videoId = youtubeMatch[1] || youtubeMatch[2];
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    // Direct MP4 or HLS
    return url;
  };

  const embedUrl = getEmbedUrl(video.video_url);
  const isEmbed = embedUrl.includes("youtube") || embedUrl.includes("vimeo");

  return (
    <Card className="overflow-hidden bg-black aspect-video">
      {isEmbed ? (
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <video
          width="100%"
          height="100%"
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full"
        >
          <source src={embedUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </Card>
  );
};

export default VideoPlayer;
