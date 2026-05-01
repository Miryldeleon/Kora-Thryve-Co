export type MarketingClass = {
  slug: string
  title: string
  category: string
  description: string
  schedule: string
  time: string
  format: string
  focus: string
  image: string | null
  accent: string
  practice: string[]
  audience: string[]
  parentReasons: {
    title: string
    description: string
    icon: string
  }[]
  about: string
  notes: string
}

export const marketingClasses: MarketingClass[] = [
  {
    slug: 'english-level-1-2',
    title: 'English Level 1–2',
    category: 'English',
    description: 'Foundational English class for beginners focusing on basic communication and early language skills.',
    schedule: 'Every 1st & 3rd Saturday of the Month',
    time: '6:00 PM – 6:45 PM',
    format: 'Online Class',
    focus: 'English Communication & Confidence',
    image: '/marketing/about_reference.png',
    accent: 'var(--soft-mint)',
    practice: ['Basic vocabulary', 'Simple sentences', 'Listening skills', 'Pronunciation practice'],
    audience: ['Beginner English learners', 'Young students starting their language journey', 'Learners who need gentle support'],
    parentReasons: [
      { title: 'Gentle Introduction', description: 'Perfect for beginners', icon: 'heart' },
      { title: 'Playful Learning', description: 'Engaging and fun activities', icon: 'check' },
      { title: 'Fixed Schedule', description: 'Regular practice builds skills', icon: 'calendar' },
    ],
    about:
      'This English Level 1–2 class provides a gentle introduction to English through playful activities, simple vocabulary building, and early language exploration in a supportive online environment.',
    notes:
      'This schedule is fixed and may be updated depending on availability. Please contact Kora Thryve & Co. for enrollment and additional details.',
  },
  {
    slug: 'english-level-3-4',
    title: 'English Level 3–4',
    category: 'English',
    description: 'Supportive English class designed to strengthen reading, speaking, and communication confidence.',
    schedule: 'Every 1st & 3rd Saturday of the Month',
    time: '5:00 PM – 5:45 PM',
    format: 'Online Class',
    focus: 'Reading, Speaking & Confidence',
    image: '/marketing/homepage_experience1.png',
    accent: 'var(--soft-mint)',
    practice: ['Reading fluency', 'Clear speaking', 'Comprehension', 'Guided conversation'],
    audience: ['Developing English learners', 'Students ready for more reading practice', 'Learners building speaking confidence'],
    parentReasons: [
      { title: 'Skill Building', description: 'Strengthens core English skills', icon: 'book' },
      { title: 'Confidence First', description: 'Encouraging speaking practice', icon: 'sparkles' },
      { title: 'Consistent Rhythm', description: 'Fixed sessions support progress', icon: 'calendar' },
    ],
    about:
      'This class helps learners strengthen reading, speaking, and communication through guided practice, thoughtful correction, and confidence-building activities.',
    notes:
      'Learners are encouraged to join with a notebook and a quiet online learning space. Schedule availability may be updated by Kora Thryve & Co.',
  },
  {
    slug: 'public-speaking',
    title: 'Public Speaking',
    category: 'Communication',
    description: 'A confidence-building class that helps learners express ideas clearly and speak in front of others.',
    schedule: 'Every 1st & 3rd Monday of the Month',
    time: '5:00 PM – 5:45 PM',
    format: 'Online Class',
    focus: 'Communication & Confidence',
    image: '/marketing/homepage_environment.png',
    accent: 'var(--sunshine-yellow)',
    practice: ['Organizing ideas', 'Voice projection', 'Speaking with clarity', 'Presentation confidence'],
    audience: ['Learners who want to speak with confidence', 'Students preparing for presentations', 'Young communicators building self-trust'],
    parentReasons: [
      { title: 'Clear Expression', description: 'Helps ideas come through', icon: 'message' },
      { title: 'Confidence Practice', description: 'Supportive speaking space', icon: 'sparkles' },
      { title: 'Real-Life Skills', description: 'Useful in school and beyond', icon: 'check' },
    ],
    about:
      'Public Speaking gives learners a calm and structured place to practice expressing ideas, using their voice, and becoming more comfortable speaking in front of others.',
    notes:
      'This class is designed for steady confidence-building. Learners do not need prior speaking experience to begin.',
  },
  {
    slug: 'vocal-session',
    title: 'Vocal Session',
    category: 'Voice',
    description: 'A guided voice class focused on vocal confidence, expression, and proper speaking or singing techniques.',
    schedule: 'Every 1st & 3rd Monday of the Month',
    time: '6:00 PM – 6:45 PM',
    format: 'Online Class',
    focus: 'Voice Care & Expression',
    image: '/marketing/homepage_experience2.png',
    accent: 'var(--warm-sand)',
    practice: ['Breathing techniques', 'Healthy vocal habits', 'Tone and expression', 'Confidence using the voice'],
    audience: ['Learners exploring voice work', 'Students interested in speaking or singing', 'Learners who want healthier vocal habits'],
    parentReasons: [
      { title: 'Voice Care', description: 'Builds healthy habits', icon: 'heart' },
      { title: 'Expression', description: 'Encourages confident voice use', icon: 'mic' },
      { title: 'Guided Practice', description: 'Calm and supportive coaching', icon: 'check' },
    ],
    about:
      'Vocal Session supports learners as they explore voice confidence, expression, and healthy technique through guided exercises and supportive feedback.',
    notes:
      'Learners should prepare water and a quiet space. Class flow may be adapted depending on learner comfort and goals.',
  },
  {
    slug: 'life-coaching',
    title: 'Life Coaching',
    category: 'Life Coaching',
    description: 'A supportive coaching session designed to help learners build confidence, self-awareness, and personal growth.',
    schedule: 'Contact Kora Thryve & Co. for more details',
    time: 'Contact for details',
    format: 'Online Class',
    focus: 'Confidence & Personal Growth',
    image: null,
    accent: 'var(--soft-peach)',
    practice: ['Goal setting', 'Self-awareness', 'Confidence routines', 'Personal reflection'],
    audience: ['Learners needing gentle support', 'Students building confidence', 'Families seeking personal growth guidance'],
    parentReasons: [
      { title: 'Personal Support', description: 'Guidance shaped around each learner', icon: 'heart' },
      { title: 'Growth Mindset', description: 'Encourages self-trust', icon: 'sparkles' },
      { title: 'Flexible Inquiry', description: 'Details provided by contact', icon: 'mail' },
    ],
    about:
      'Life Coaching gives learners a supportive space to build self-awareness, confidence, and practical personal growth habits with caring guidance.',
    notes:
      'Life Coaching schedule details are arranged by inquiry. Please contact Kora Thryve & Co. to discuss availability and fit.',
  },
]

export function getMarketingClassBySlug(slug: string) {
  return marketingClasses.find((classItem) => classItem.slug === slug)
}
