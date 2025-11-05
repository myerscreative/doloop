'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CreateLoopWelcomePage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/loops/new');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Bee Illustration */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8 flex justify-center items-center w-full"
        style={{ border: '2px solid red' }}
      >
        <div className="flex justify-center items-center" style={{ transform: 'translateX(30px)', border: '2px solid blue' }}>
          <Image
            src="/doloop-bee.svg"
            alt="DoLoop Bee"
            width={200}
            height={200}
            style={{ display: 'block', border: '2px solid green' }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl font-bold text-gray-900 mb-4 text-center"
        style={{ border: '2px solid purple' }}
      >
        Create a new DoLoop
      </motion.h1>

      {/* Description Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-gray-600 text-center mb-12 max-w-md"
        style={{ border: '2px solid orange' }}
      >
        Create a recipe for success — a checklist you can use over and over.
      </motion.p>

      {/* Create Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        onClick={handleContinue}
        className="flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ border: '2px solid cyan' }}
      >
        <Image
          src="/arrow-circle-plus-complete.svg"
          alt="Create Loop"
          width={80}
          height={80}
          style={{ border: '2px solid magenta' }}
        />
      </motion.button>
    </div>
  );
}

