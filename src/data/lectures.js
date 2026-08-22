// Multi-Lecture Vault registry. Each lecture bundles its own cross-linked
// JSON database (transcript / frames / audio / notes) and its keyframe folder.
import wavyWindows from './sample_data.json'
import neuralNets from './lecture_neural.json'
import photosynthesis from './lecture_photosynthesis.json'

export const LECTURES = [
  {
    id: 'wavy-windows',
    title: 'The Wavy Window Paradox',
    subject: 'Physics · Optics',
    duration: '3:19',
    accent: '#3b82f6',
    frameBase: '/frames',
    data: wavyWindows,
    prompts: ['What is reflection of light?', 'Summarize audio notes', 'Explain Snell\'s Law'],
  },
  {
    id: 'neural-nets',
    title: 'Neural Networks 101',
    subject: 'Computer Science · ML',
    duration: '2:30',
    accent: '#a855f7',
    frameBase: '/frames/neural-nets',
    data: neuralNets,
    prompts: ['What is a perceptron?', 'How does backpropagation work?', 'Show the network diagram'],
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis Explained',
    subject: 'Biology',
    duration: '2:30',
    accent: '#22c55e',
    frameBase: '/frames/photosynthesis',
    data: photosynthesis,
    prompts: ['What happens in the Calvin cycle?', 'Summarize the light reactions', 'Show the chloroplast'],
  },
]

export const getLecture = (id) => LECTURES.find((l) => l.id === id) || LECTURES[0]
