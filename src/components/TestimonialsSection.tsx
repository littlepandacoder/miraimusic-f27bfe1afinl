import { useRef } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "My daughter went from never touching a piano to playing full songs in just 6 weeks. The AI feedback is like having a teacher watching every session.",
    name: "Sarah M.",
    child: "Mother of Emma, age 9",
    stars: 5,
  },
  {
    quote:
      "We tried two other apps before Musicable. Nothing comes close. My son actually asks to practise — I never thought I'd say that.",
    name: "James T.",
    child: "Father of Liam, age 11",
    stars: 5,
  },
  {
    quote:
      "The progress tracking keeps us both motivated. My daughter can literally see herself improving week by week. Worth every penny.",
    name: "Priya K.",
    child: "Mother of Anaya, age 8",
    stars: 5,
  },
  {
    quote:
      "I was sceptical about online piano learning but the quality of lessons blew me away. My son's piano teacher was impressed at his last recital.",
    name: "David L.",
    child: "Father of Noah, age 13",
    stars: 5,
  },
  {
    quote:
      "Musicable fits perfectly into our busy schedule. 20 minutes a day and my daughter has learned more than a full year of traditional lessons.",
    name: "Aisha R.",
    child: "Mother of Zara, age 10",
    stars: 5,
  },
  {
    quote:
      "The gamified learning map keeps my twins competing with each other in the best way. They both beg to do their piano practice!",
    name: "Carlos & Maria F.",
    child: "Parents of Sofia & Diego, age 7",
    stars: 5,
  },
  {
    quote:
      "As a parent with no music background, I love that I can follow along too. The app explains everything clearly and the support team is fantastic.",
    name: "Rachel W.",
    child: "Mother of Oliver, age 12",
    stars: 5,
  },
];

const TestimonialsSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("div")?.offsetWidth ?? 320;
    el.scrollBy({ left: direction === "left" ? -cardWidth - 16 : cardWidth + 16, behavior: "smooth" });
  };

  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-pink text-xs font-bold uppercase tracking-widest mb-2">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter leading-tight">
              WHAT OUR<br />
              <span className="text-pink">PARENTS SAY</span>
            </h2>
          </div>
          {/* Arrow buttons */}
          <div className="flex gap-2 shrink-0 mb-1">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-11 h-11 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-foreground hover:bg-pink hover:border-pink hover:text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-11 h-11 rounded-full border border-border/40 bg-card/60 flex items-center justify-center text-foreground hover:bg-pink hover:border-pink hover:text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[300px] sm:w-[340px] bg-card/50 border border-border/30 rounded-2xl p-6 flex flex-col gap-4 backdrop-blur-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} size={14} className="fill-pink text-pink" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground/85 text-sm leading-relaxed flex-1">
                <span className="text-pink text-2xl font-black leading-none mr-1">"</span>
                {t.quote}
                <span className="text-pink text-2xl font-black leading-none ml-1">"</span>
              </p>

              {/* Author */}
              <div className="border-t border-border/20 pt-4">
                <p className="font-bold text-foreground text-sm">{t.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{t.child}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Fade edges hint */}
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </section>
  );
};

export default TestimonialsSection;
