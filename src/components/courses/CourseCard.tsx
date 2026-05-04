import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, FileText, Lock } from "lucide-react";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    price: number;
    level: "beginner" | "intermediate" | "advanced";
    instructor_name: string;
    video_count: number;
    note_count: number;
  };
  isEnrolled: boolean;
  onClick: () => void;
}

const CourseCard = ({ course, isEnrolled, onClick }: CourseCardProps) => {
  const getLevelColor = (level: string) => {
    const colors = {
      beginner: "bg-green/20 text-green border-green/30",
      intermediate: "bg-yellow/20 text-yellow border-yellow/30",
      advanced: "bg-pink/20 text-pink border-pink/30",
    };
    return colors[level as keyof typeof colors] || colors.beginner;
  };

  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer group hover:shadow-lg hover:shadow-pink/20 transition-all duration-300 hover:border-pink/50 bg-card/50 backdrop-blur-sm border-border/30 h-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative w-full h-48 bg-gradient-to-br from-pink/10 to-navy/10 overflow-hidden">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-pink/20 flex items-center justify-center">
              <span className="text-3xl">🎹</span>
            </div>
          </div>
        )}
        {!isEnrolled && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Lock className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-pink transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
          {course.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className={`${getLevelColor(course.level)} border`}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            by {course.instructor_name}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border/30">
          <div className="flex items-center gap-1">
            <Play size={16} className="text-pink" />
            <span>{course.video_count} videos</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText size={16} className="text-pink" />
            <span>{course.note_count} notes</span>
          </div>
        </div>

        {/* Status */}
        {isEnrolled && (
          <div className="mt-3 px-3 py-1.5 bg-green/20 text-green text-xs font-semibold rounded text-center border border-green/30">
            ✓ Enrolled
          </div>
        )}
      </div>
    </Card>
  );
};

export default CourseCard;
