export const authCookieName = "speakup_token";

export const learningLevels = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "FLUENT",
] as const;

export const userRoles = ["USER", "ADMIN"] as const;

export const postVisibilities = ["VISIBLE", "HIDDEN"] as const;

export const roomProviders = ["WEBRTC", "LIVEKIT", "HMS"] as const;

export const defaultRecordingPrompts = [
  {
    title: "My Daily Routine",
    description: "A simple beginner-friendly prompt for daily speaking practice.",
    script:
      "My daily routine is very simple. I wake up early in the morning at 6 o'clock. First, I brush my teeth and take a bath. Then I have my breakfast. After that, I go to college. I attend my classes and learn new things. In the afternoon, I come back home and take lunch. In the evening, I do my homework and sometimes play games. At night, I have dinner with my family and go to sleep early.",
    level: "BEGINNER",
  },
  {
    title: "Importance of Education",
    description: "A guided prompt that helps learners explain ideas clearly.",
    script:
      "Education is very important in our life. It helps us to gain knowledge and skills. Education makes a person wise and confident. It also helps us to get a good job and live a better life. An educated person can understand what is right and wrong. Education also helps in the development of society and the country. Therefore, everyone should get education.",
    level: "INTERMEDIATE",
  },
  {
    title: "My Hobby",
    description: "A friendly prompt for speaking about interests and personality.",
    script:
      "My hobby is playing cricket. I like to play cricket in my free time. It keeps me active and healthy. I play with my friends in the playground. Cricket also teaches teamwork and discipline. I enjoy watching cricket matches on TV. My favorite player is Virat Kohli.",
    level: "BEGINNER",
  },
] as const;
