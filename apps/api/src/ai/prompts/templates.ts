import type { PromptTemplate } from './prompt-manager';

export const resumeAnalysisPrompt: PromptTemplate = {
  name: 'resume',
  version: '1.0.0',
  systemInstruction: `You are an expert technical recruiter and ATS parsing engine. Analyze the provided resume text and user profile to generate a structured assessment. 
  Follow these guidelines strictly:
  1. Do not invent any projects, experience, or skills.
  2. If information is not present, set it to null or return an empty array.
  3. Never claim guaranteed employment outcomes.
  4. Provide actionable ATS optimization suggestions.`,
  userInstructionTemplate: `Resume Text:
  {resumeText}
  
  Profile Info:
  {profileInfo}
  
  Career Preferences:
  {preferencesInfo}`,
  expectedSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      skills: { type: 'array', items: { type: 'string' } },
      technicalSkills: { type: 'array', items: { type: 'string' } },
      softSkills: { type: 'array', items: { type: 'string' } },
      projects: { type: 'array', items: { type: 'string' } },
      certifications: { type: 'array', items: { type: 'string' } },
      education: { type: 'array', items: { type: 'string' } },
      experience: { type: 'array', items: { type: 'string' } },
      strengths: { type: 'array', items: { type: 'string' } },
      weaknesses: { type: 'array', items: { type: 'string' } },
      missingInformation: { type: 'array', items: { type: 'string' } },
      atsSuggestions: { type: 'array', items: { type: 'string' } },
      careerSuggestions: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'summary',
      'skills',
      'technicalSkills',
      'softSkills',
      'projects',
      'certifications',
      'education',
      'experience',
      'strengths',
      'weaknesses',
      'missingInformation',
      'atsSuggestions',
      'careerSuggestions',
    ],
  },
};

export const jobSummaryPrompt: PromptTemplate = {
  name: 'job-summary',
  version: '1.0.0',
  systemInstruction: `You are a career assistant summarising internship descriptions.
  Guidelines:
  1. Use ONLY information contained in the job posting.
  2. Never invent salary/stipend, deadlines, eligibility requirements, or company information. If not specified, state "Not Specified".`,
  userInstructionTemplate: `Job Posting:
  {jobDescription}`,
  expectedSchema: {
    type: 'object',
    properties: {
      roleSummary: { type: 'string' },
      responsibilities: { type: 'array', items: { type: 'string' } },
      requiredSkills: { type: 'array', items: { type: 'string' } },
      preferredSkills: { type: 'array', items: { type: 'string' } },
      eligibility: { type: 'array', items: { type: 'string' } },
      workMode: { type: 'string' },
      location: { type: 'string' },
      duration: { type: 'string' },
      stipend: { type: 'string' },
      keyTakeaways: { type: 'array', items: { type: 'string' } },
      importantRequirements: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'roleSummary',
      'responsibilities',
      'requiredSkills',
      'preferredSkills',
      'eligibility',
      'workMode',
      'location',
      'duration',
      'stipend',
      'keyTakeaways',
      'importantRequirements',
    ],
  },
};

export const matchExplanationPrompt: PromptTemplate = {
  name: 'match-explanation',
  version: '1.0.0',
  systemInstruction: `You are a career coach explaining why a candidate matches an internship posting.
  Guidelines:
  1. You must explain the existing match scores and reasons. Do NOT generate a different overall score.
  2. Map your explanation to the provided numerical scores. 
  3. Clearly state this is an AI-generated analysis.`,
  userInstructionTemplate: `User Profile:
  {profileInfo}
  
  Job Posting:
  {jobInfo}
  
  Match Scores:
  {matchScores}
  
  Recommendation Reasons:
  {reasons}`,
  expectedSchema: {
    type: 'object',
    properties: {
      matchSummary: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' } },
      skillMatches: { type: 'array', items: { type: 'string' } },
      preferenceMatches: { type: 'array', items: { type: 'string' } },
      potentialGaps: { type: 'array', items: { type: 'string' } },
      applicationAdvice: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'matchSummary',
      'strengths',
      'skillMatches',
      'preferenceMatches',
      'potentialGaps',
      'applicationAdvice',
    ],
  },
};

export const skillGapPrompt: PromptTemplate = {
  name: 'skill-gap',
  version: '1.0.0',
  systemInstruction: `You are an expert technical developer. Compare user skills and resume keywords against internship requirements.
  Guidelines:
  1. Do not claim a skill is missing if it is present in the profile or resume.
  2. Categorize missing skills into required vs. preferred.`,
  userInstructionTemplate: `User Skills & Resume:
  {userSkills}
  
  Job Description & Required/Preferred Skills:
  {jobSkills}`,
  expectedSchema: {
    type: 'object',
    properties: {
      matchedSkills: { type: 'array', items: { type: 'string' } },
      missingRequiredSkills: { type: 'array', items: { type: 'string' } },
      missingPreferredSkills: { type: 'array', items: { type: 'string' } },
      recommendedSkills: { type: 'array', items: { type: 'string' } },
      priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
      learningSuggestions: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'matchedSkills',
      'missingRequiredSkills',
      'missingPreferredSkills',
      'recommendedSkills',
      'priority',
      'learningSuggestions',
    ],
  },
};

export const coverLetterPrompt: PromptTemplate = {
  name: 'cover-letter',
  version: '1.0.0',
  systemInstruction: `You are a professional cover letter writer. Generate a tailored cover letter.
  Guidelines:
  1. Professional, concise, and specific.
  2. No fabricated achievements.
  3. Do not invent experience, projects, certifications, or awards.`,
  userInstructionTemplate: `User Profile & Resume:
  {profileInfo}
  
  Job Posting:
  {jobInfo}
  
  Company:
  {companyInfo}`,
};

export const referralPrompt: PromptTemplate = {
  name: 'referral',
  version: '1.0.0',
  systemInstruction: `You are a network building expert. Generate professional referral messages.
  Guidelines:
  1. Personalise using actual company and role details.
  2. Never fabricate a relationship with the recipient.
  3. Produce a LinkedIn message, Email, and Short message (SMS/chat).`,
  userInstructionTemplate: `User Profile & Resume:
  {profileInfo}
  
  Target Company & Role:
  {targetInfo}`,
  expectedSchema: {
    type: 'object',
    properties: {
      linkedinMessage: { type: 'string' },
      emailSubject: { type: 'string' },
      emailBody: { type: 'string' },
      shortMessage: { type: 'string' },
    },
    required: ['linkedinMessage', 'emailSubject', 'emailBody', 'shortMessage'],
  },
};

export const interviewPrompt: PromptTemplate = {
  name: 'interview',
  version: '1.0.0',
  systemInstruction: `You are a technical interviewer. Generate mock preparation questions.
  Guidelines:
  1. Clearly label questions as AI-generated practice questions.
  2. Do not claim they are leaked real questions.`,
  userInstructionTemplate: `Candidate Details:
  {profileInfo}
  
  Job Description & Company:
  {jobInfo}`,
  expectedSchema: {
    type: 'object',
    properties: {
      technical: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            difficulty: { type: 'string' },
            expectedTopics: { type: 'array', items: { type: 'string' } },
            preparationTips: { type: 'string' },
            sampleAnswerGuidance: { type: 'string' },
          },
          required: [
            'question',
            'difficulty',
            'expectedTopics',
            'preparationTips',
            'sampleAnswerGuidance',
          ],
        },
      },
      behavioral: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            difficulty: { type: 'string' },
            expectedTopics: { type: 'array', items: { type: 'string' } },
            preparationTips: { type: 'string' },
            sampleAnswerGuidance: { type: 'string' },
          },
          required: [
            'question',
            'difficulty',
            'expectedTopics',
            'preparationTips',
            'sampleAnswerGuidance',
          ],
        },
      },
      hr: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            difficulty: { type: 'string' },
            expectedTopics: { type: 'array', items: { type: 'string' } },
            preparationTips: { type: 'string' },
            sampleAnswerGuidance: { type: 'string' },
          },
          required: [
            'question',
            'difficulty',
            'expectedTopics',
            'preparationTips',
            'sampleAnswerGuidance',
          ],
        },
      },
      roleSpecific: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            difficulty: { type: 'string' },
            expectedTopics: { type: 'array', items: { type: 'string' } },
            preparationTips: { type: 'string' },
            sampleAnswerGuidance: { type: 'string' },
          },
          required: [
            'question',
            'difficulty',
            'expectedTopics',
            'preparationTips',
            'sampleAnswerGuidance',
          ],
        },
      },
      practiceDisclaimer: { type: 'string' },
    },
    required: ['technical', 'behavioral', 'hr', 'roleSpecific', 'practiceDisclaimer'],
  },
};

export const comparisonPrompt: PromptTemplate = {
  name: 'comparison',
  version: '1.0.0',
  systemInstruction: `You are a career advisor comparing multiple internships.
  Guidelines:
  1. Structure key comparison parameters objectively.
  2. Present recommendations as guidance, not guaranteed career advice.`,
  userInstructionTemplate: `User Profile:
  {profileInfo}
  
  Jobs list with details and match scores:
  {jobsList}`,
  expectedSchema: {
    type: 'object',
    properties: {
      comparisons: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            title: { type: 'string' },
            company: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            location: { type: 'string' },
            stipend: { type: 'string' },
            duration: { type: 'string' },
            workMode: { type: 'string' },
            careerRelevance: { type: 'string' },
            skillGap: { type: 'array', items: { type: 'string' } },
            competitionIndicator: { type: 'string' },
            matchScore: { type: 'number' },
            pros: { type: 'array', items: { type: 'string' } },
            cons: { type: 'array', items: { type: 'string' } },
          },
          required: [
            'jobId',
            'title',
            'company',
            'skills',
            'location',
            'stipend',
            'duration',
            'workMode',
            'careerRelevance',
            'skillGap',
            'competitionIndicator',
            'matchScore',
            'pros',
            'cons',
          ],
        },
      },
      recommendation: { type: 'string' },
    },
    required: ['comparisons', 'recommendation'],
  },
};

export const roadmapPrompt: PromptTemplate = {
  name: 'roadmap',
  version: '1.0.0',
  systemInstruction: `You are a learning path designer. Generate a personalized weekly learning plan.
  Guidelines:
  1. Prioritize skills relevant to the user's target internship.
  2. Do not guarantee employment outcomes.`,
  userInstructionTemplate: `Target Role: {targetRole}
  Target Company: {targetCompany}
  Current Skills: {currentSkills}
  Missing Skills: {missingSkills}`,
  expectedSchema: {
    type: 'object',
    properties: {
      learningGoals: { type: 'array', items: { type: 'string' } },
      weeklyPlan: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            week: { type: 'number' },
            topics: { type: 'array', items: { type: 'string' } },
            practiceTasks: { type: 'array', items: { type: 'string' } },
            resources: { type: 'array', items: { type: 'string' } },
          },
          required: ['week', 'topics', 'practiceTasks', 'resources'],
        },
      },
      skillsToLearn: { type: 'array', items: { type: 'string' } },
      projectIdeas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            technologies: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'description', 'technologies'],
        },
      },
      practiceTopics: { type: 'array', items: { type: 'string' } },
      milestones: { type: 'array', items: { type: 'string' } },
      estimatedDuration: { type: 'string' },
      employmentDisclaimer: { type: 'string' },
    },
    required: [
      'learningGoals',
      'weeklyPlan',
      'skillsToLearn',
      'projectIdeas',
      'practiceTopics',
      'milestones',
      'estimatedDuration',
      'employmentDisclaimer',
    ],
  },
};

export const chatPrompt: PromptTemplate = {
  name: 'chat',
  version: '1.0.0',
  systemInstruction: `You are the AI Career Copilot for InternTracker AI. 
  Guidelines:
  1. Answer questions concisely, objectively, and politely.
  2. Stay within the context of the user's profile, resume, and active internship details.
  3. Never invent information or claim guaranteed outcomes.`,
  userInstructionTemplate: `User Context:
  {userContext}
  
  Active Job Context (if any):
  {jobContext}
  
  User Message:
  {message}`,
};

export const resumeParsingPrompt: PromptTemplate = {
  name: 'resume-parsing',
  version: '1.0.0',
  systemInstruction: `You are an expert ATS parser. Extract candidate information from raw resume text.
  Guidelines:
  1. Extract only facts directly stated in the text.
  2. Do not invent degrees, companies, projects, or metrics.
  3. Provide a confidence score for each extracted block.`,
  userInstructionTemplate: `Resume Text:
  {resumeText}`,
  expectedSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            degree: { type: 'string' },
            college: { type: 'string' },
            cgpa: { type: 'string' }
          },
          required: ['degree', 'college']
        }
      },
      skills: { type: 'array', items: { type: 'string' } },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            technologies: { type: 'array', items: { type: 'string' } }
          },
          required: ['name', 'description']
        }
      },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            company: { type: 'string' },
            description: { type: 'array', items: { type: 'string' } }
          },
          required: ['role', 'company']
        }
      },
      certifications: { type: 'array', items: { type: 'string' } },
      achievements: { type: 'array', items: { type: 'string' } },
      links: { type: 'array', items: { type: 'string' } },
      confidenceScore: { type: 'number' }
    },
    required: ['skills', 'education', 'projects', 'experience']
  }
};

export const resumeOptimizationPrompt: PromptTemplate = {
  name: 'resume-optimization',
  version: '1.0.0',
  systemInstruction: `You are an expert technical resume writer. Analyze the resume, user profile, and optionally a target job description to generate targeted resume optimization suggestions.
  Guidelines:
  1. Do not invent experience, achievements, certifications, or qualifications.
  2. For any suggestion, include the original text, the suggested improved text, and the reason.
  3. Suggest improvements for bullet points, project details, and experience entries based strictly on user data.
  4. Generate a professional summary if requested, using only real information.
  5. Organize the user's existing skills into standardized categories: Programming, Frameworks, Databases, Cloud, AI/ML, Tools, Soft Skills. Do not invent skills.
  6. Calculate the InternTracker Resume Quality Score (0-100) and its breakdown based on the following weights:
     - ATS Structure: 25%
     - Skill Alignment: 25%
     - Content Quality: 20%
     - Role Relevance: 15%
     - Completeness: 10%
     - Consistency: 5%`,
  userInstructionTemplate: `Resume:
  {resumeText}
  
  User Profile:
  {profileInfo}
  
  Target Job Description (optional):
  {jobDescription}
  
  Optimization Request:
  {requestType}`,
  expectedSchema: {
    type: 'object',
    properties: {
      qualityScore: { type: 'number' },
      scoreBreakdown: {
        type: 'object',
        properties: {
          ats: { type: 'number' },
          skill: { type: 'number' },
          content: { type: 'number' },
          relevance: { type: 'number' },
          completeness: { type: 'number' },
          consistency: { type: 'number' }
        },
        required: ['ats', 'skill', 'content', 'relevance', 'completeness', 'consistency']
      },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sectionType: { type: 'string' },
            originalText: { type: 'string' },
            suggestedText: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['sectionType', 'originalText', 'suggestedText', 'reason']
        }
      },
      missingKeywords: { type: 'array', items: { type: 'string' } },
      matchedKeywords: { type: 'array', items: { type: 'string' } },
      categorizedSkills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } }
          },
          required: ['category', 'skills']
        }
      }
    },
    required: ['qualityScore', 'scoreBreakdown', 'suggestions', 'missingKeywords', 'matchedKeywords', 'categorizedSkills']
  }
};

export const portfolioOptimizationPrompt: PromptTemplate = {
  name: 'portfolio-optimization',
  version: '1.0.0',
  systemInstruction: `You are an expert career brand strategist. Analyze the user's portfolio and profile to suggest improvements for clarity, role alignment, project description quality, and professional presentation.
  Guidelines:
  1. Do not invent any experience, projects, or credentials.
  2. Flag missing sections.
  3. Offer clear suggestions for improvement.`,
  userInstructionTemplate: `Portfolio Content:
  {portfolioContent}
  
  Profile Info:
  {profileInfo}`,
  expectedSchema: {
    type: 'object',
    properties: {
      score: { type: 'number' },
      roleAlignment: { type: 'string' },
      suggestions: { type: 'array', items: { type: 'string' } },
      missingSections: { type: 'array', items: { type: 'string' } },
      improvementSummary: { type: 'string' }
    },
    required: ['score', 'roleAlignment', 'suggestions', 'missingSections', 'improvementSummary']
  }
};

