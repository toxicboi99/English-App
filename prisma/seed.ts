import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const starterWords = [
  {
    word: "articulate",
    definition: "Able to express thoughts and ideas clearly and effectively.",
    partOfSpeech: "adjective",
    phonetic: "/ar-TIK-yuh-luht/",
    exampleSentence: "She is articulate when presenting her ideas in class.",
    level: "INTERMEDIATE",
  },
  {
    word: "confident",
    definition: "Feeling sure about your abilities or qualities.",
    partOfSpeech: "adjective",
    phonetic: "/KON-fi-duhnt/",
    exampleSentence: "He sounded confident during the group discussion.",
    level: "BEGINNER",
  },
  {
    word: "debate",
    definition: "A formal discussion where different opinions are expressed.",
    partOfSpeech: "noun",
    phonetic: "/dih-BAYT/",
    exampleSentence: "The students joined a debate about climate change.",
    level: "BEGINNER",
  },
  {
    word: "fluency",
    definition: "The ability to speak or write a language smoothly and accurately.",
    partOfSpeech: "noun",
    phonetic: "/FLOO-uhn-see/",
    exampleSentence: "Daily practice helped improve her English fluency.",
    level: "INTERMEDIATE",
  },
  {
    word: "idiom",
    definition: "A group of words whose meaning is different from the literal meaning of each word.",
    partOfSpeech: "noun",
    phonetic: "/ID-ee-uhm/",
    exampleSentence: "Learning one idiom a day can make speech sound more natural.",
    level: "ADVANCED",
  },
  {
    word: "intonation",
    definition: "The rise and fall of the voice when speaking.",
    partOfSpeech: "noun",
    phonetic: "/in-toh-NAY-shuhn/",
    exampleSentence: "Good intonation makes spoken English easier to understand.",
    level: "INTERMEDIATE",
  },
  {
    word: "perspective",
    definition: "A particular way of considering something.",
    partOfSpeech: "noun",
    phonetic: "/per-SPEK-tiv/",
    exampleSentence: "Debate rooms expose learners to new perspectives.",
    level: "ADVANCED",
  },
  {
    word: "pronunciation",
    definition: "The way in which a word is spoken.",
    partOfSpeech: "noun",
    phonetic: "/pruh-nun-see-AY-shuhn/",
    exampleSentence: "The app gives feedback on pronunciation accuracy.",
    level: "BEGINNER",
  },
  {
    word: "resilient",
    definition: "Able to recover quickly from challenges or difficulties.",
    partOfSpeech: "adjective",
    phonetic: "/ri-ZIL-yuhnt/",
    exampleSentence: "Language learners become resilient through consistent practice.",
    level: "ADVANCED",
  },
  {
    word: "vocabulary",
    definition: "The body of words known or used by a person.",
    partOfSpeech: "noun",
    phonetic: "/voh-KAB-yuh-ler-ee/",
    exampleSentence: "Her vocabulary improved after using the dictionary tool.",
    level: "BEGINNER",
  },
] as const;

async function main() {
  for (const word of starterWords) {
    await prisma.dictionaryWord.upsert({
      where: { word: word.word },
      update: word,
      create: word,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
