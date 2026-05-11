import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
];

const AssessmentSection = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !selectedTime || !name || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    // Format date for Google Calendar
    const formattedDate = date.toISOString().split('T')[0];
    const [time, period] = selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const startDateTime = new Date(date);
    startDateTime.setHours(hours, minutes, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(hours + 1);

    // Create Google Calendar event URL
    const eventTitle = encodeURIComponent(`Musicable Partnership Call - ${name}`);
    const eventDetails = encodeURIComponent(
      `Free Discovery Call — Musicable Partnership\n\nContact: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nOrganisation Type: ${experience || 'Not specified'}\n\nAbout their school/studio: ${message || 'None'}`
    );
    const eventLocation = encodeURIComponent("Online - Link will be sent via email");
    
    const startStr = startDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endStr = endDateTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startStr}/${endStr}&details=${eventDetails}&location=${eventLocation}&add=musicableapp%40proton.me`;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Open Google Calendar in new tab
    window.open(googleCalendarUrl, '_blank');
    
    setIsSubmitting(false);
    setIsBooked(true);
    toast.success("Assessment scheduled! Add it to your Google Calendar.");
  };

  if (isBooked) {
    return (
      <section id="assessment" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-lime/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-lime" />
            </div>
            <h2 className="section-title text-foreground mb-4">
              WE'LL BE IN TOUCH!
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Your discovery call has been scheduled. We've opened Google Calendar so you can save the event.
              Expect a confirmation email with the meeting link shortly.
            </p>
            <Button
              onClick={() => setIsBooked(false)}
              className="btn-primary"
            >
              Schedule Another Call
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="assessment" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-title text-foreground mb-4">
            BRING MUSICABLE TO YOUR SCHOOL OR STUDIO.
          </h2>
          <p className="text-xl text-muted-foreground">
            Book a free discovery call and find out how we can partner together to transform piano education.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
            {/* Left - Calendar */}
            <div className="feature-card">
              <div className="flex items-center gap-3 mb-6">
                <CalendarDays className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Select Date & Time</h3>
              </div>
              
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                className="rounded-lg border border-border bg-card p-3 pointer-events-auto"
              />
              
              {date && (
                <div className="mt-6">
                  <Label className="text-foreground mb-3 block">Available Time Slots</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-border hover:border-primary"
                        }`}
                      >
                        <Clock className="w-4 h-4 inline mr-2" />
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Form */}
            <div className="feature-card">
              <h3 className="text-xl font-bold text-foreground mb-6">Your Information</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1 bg-secondary border-border"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1 bg-secondary border-border"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="mt-1 bg-secondary border-border"
                  />
                </div>
                
                <div>
                  <Label htmlFor="experience" className="text-foreground">Organisation Type</Label>
                  <Select value={experience} onValueChange={setExperience}>
                    <SelectTrigger className="mt-1 bg-secondary border-border">
                      <SelectValue placeholder="Select your organisation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private-teacher">Private Music Teacher</SelectItem>
                      <SelectItem value="music-school">Music School or Studio</SelectItem>
                      <SelectItem value="k12-school">K-12 School</SelectItem>
                      <SelectItem value="university">University or College</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message" className="text-foreground">Tell Us About Your School or Studio</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How many students do you teach? What are your goals with Musicable?"
                    className="mt-1 bg-secondary border-border min-h-[100px]"
                  />
                </div>

                <Button
                  type="submit"
                  className="btn-primary w-full mt-6"
                  disabled={isSubmitting || !date || !selectedTime}
                >
                  {isSubmitting ? "Scheduling..." : "Book a Free Discovery Call"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By booking, you agree to our terms and privacy policy.
                  A Google Calendar invite will be sent to both parties.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default AssessmentSection;
