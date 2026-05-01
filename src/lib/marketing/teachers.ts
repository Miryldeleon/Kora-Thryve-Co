export type MarketingTeacher = {
  id: string
  name: string
  category: string
  specialty: string
  image: string | null
  badgeColor: string
  bio: string
  shortDescription: string
  tags: string[]
  experience: string
  availability: string
  expertise: string[]
  education: string[]
  approach: string
  whyChoose: {
    title: string
    description: string
  }[]
}

export const marketingTeachers: MarketingTeacher[] = [
  {
    id: 'cherrilyn',
    name: 'Cherrilyn',
    category: 'Coach | Teacher',
    specialty: 'Life Coaching, Speech & Drama, Voice, and English Support',
    image: null,
    badgeColor: '#F2D46B',
    shortDescription:
      'Coach and teacher supporting learners through communication, confidence, life skills, voice, and English guidance.',
    bio:
      'Cherrilyn is a coach and teacher with a multidisciplinary background in industrial education, speech and drama, English language teaching, life coaching, voice training, and first aid. Her experience across education, wellness, music, public speaking, and community service allows her to support learners with both skill-building and genuine care.',
    tags: ['Life Coaching', 'Speech & Drama', 'Voice', 'English'],
    experience: 'Education, coaching, public speaking, and volunteer service',
    availability: 'Contact for schedule details',
    expertise: [
      'Life Coaching & Confidence Building',
      'Speech and Drama',
      'English Language Support',
      'TESOL / TEFL Learning Support',
      'Voice and Music Foundations',
      'Public Speaking for Students and Teachers',
      'Wellness and Health Coaching',
      'Child Safety and First Aid Awareness',
    ],
    education: [
      "Bachelor's Degree in Industrial Education",
      'Certificate for Speech and Drama under the Julia Gabriel Foundation, Singapore',
      'Introduction to DataWise: A Collaborative Process to Improve Learning and Teaching by Harvard Online Initiative (Harvard University)',
      '120-Hour TESOL / TEFL Certificate (CPD Accredited)',
      'Life Coach Certification Masterclass (Wellness & Health), CPD Accredited',
      'Certificate for First Aid (Child, BCLS + AED & Standard First Aid)',
      'Graduate from Center for Pop Music Philippines',
      'Volunteer Public Speaker for Students & Teachers',
      'Volunteer for the Elderly in Singapore',
    ],
    approach:
      'Cherrilyn brings a warm, practical, and confidence-centered approach to every learner. She combines structured teaching with coaching tools, communication practice, and supportive guidance so students can grow in skill and self-belief. Her sessions are shaped by each learner’s needs, whether the goal is stronger English, clearer speaking, voice confidence, or personal growth.',
    whyChoose: [
      {
        title: 'Whole-Learner Care',
        description: 'Combines education, coaching, wellness, and communication support.',
      },
      {
        title: 'Confidence Focus',
        description: 'Helps learners build practical skills while growing self-trust.',
      },
      {
        title: 'Broad Expertise',
        description: 'Brings training across speech, English, life coaching, voice, and safety.',
      },
    ],
  },
  {
    id: 'divina',
    name: 'Divina',
    category: 'Teacher',
    specialty: 'English Language Teaching and Learner Support',
    image: null,
    badgeColor: '#DCEFE5',
    shortDescription:
      'English teacher with CELTA training and a caring background in documentation, community service, and learner support.',
    bio:
      'Divina is an English teacher with CELTA training from Cambridge University and experience in professional documentation work. Her community volunteer background reflects her patient, service-minded approach to supporting learners with clarity, encouragement, and care.',
    tags: ['English', 'CELTA', 'Learner Support'],
    experience: 'English teaching, documentation, and community volunteer service',
    availability: 'Contact for schedule details',
    expertise: [
      'English Language Teaching',
      'CELTA-Based Teaching Practice',
      'Communication Support',
      'Reading and Speaking Confidence',
      'Learner Encouragement',
      'Organized Documentation',
      'Community-Based Support',
    ],
    education: [
      'CELTA (Certificate in English Language Teaching to Speakers of Other Languages) - Cambridge University',
      'Documentation Officer, S Mulchand & Sons (S) Pte Ltd',
      'Volunteer for the Elderly in Singapore, 2019-2021',
      'Volunteer at Sikh Temple in Singapore, 2024-2025',
    ],
    approach:
      'Divina teaches with patience, structure, and a strong focus on clear communication. She supports learners by making English practice approachable and organized, helping them build language confidence step by step. Her background in volunteer service brings empathy and attentiveness into each learning interaction.',
    whyChoose: [
      {
        title: 'CELTA Trained',
        description: 'Uses recognized English teaching foundations to support learners.',
      },
      {
        title: 'Patient Support',
        description: 'Creates a calm learning space where students can practice with confidence.',
      },
      {
        title: 'Organized Guidance',
        description: 'Brings clarity, structure, and care to language learning.',
      },
    ],
  },
]

export function getMarketingTeacherById(id: string) {
  return marketingTeachers.find((teacher) => teacher.id === id)
}
