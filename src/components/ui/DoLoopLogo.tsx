'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

type Theme = 'minimal' | 'playful' | 'professional';

interface DoLoopLogoProps {
  theme?: Theme;
  size?: 'sm' | 'md' | 'lg';
  showBee?: boolean;
  animated?: boolean;
  headerLight?: boolean; // For use on dark backgrounds
  className?: string;
  useSVGLogo?: boolean; // Use the new SVG logo instead of text-based
}

export function DoLoopLogo({
  theme = 'minimal',
  size = 'md',
  showBee = true,
  animated = true,
  headerLight = false,
  className = '',
  useSVGLogo = true, // Default to using SVG logo
}: DoLoopLogoProps) {
  // Size configurations
  const sizes = {
    sm: { text: 'text-xl', bee: 24, svg: 120 },
    md: { text: 'text-2xl', bee: 32, svg: 160 },
    lg: { text: 'text-4xl', bee: 48, svg: 240 },
  };
  
  const sizeConfig = sizes[size];
  
  // If using SVG logo, render it directly
  if (useSVGLogo) {
    return (
      <motion.div
        className={`inline-block ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src="/doloop-logo.svg"
          alt="DoLoop Logo"
          width={sizeConfig.svg}
          height={sizeConfig.svg}
          className="h-auto"
          priority
        />
      </motion.div>
    );
  }
  
  // Theme configurations for text-based logo
  const themeConfig = {
    minimal: {
      doColor: headerLight ? '#FFFFFF' : '#FFB800',
      loopColor: headerLight ? '#FFFFFF' : '#6B7280',
      beeOpacity: 1,
      trailOpacity: headerLight ? 0.5 : 0.3,
    },
    playful: {
      doColor: headerLight ? '#FFFFFF' : '#FFB800',
      loopColor: headerLight ? '#FFFFFF' : '#6B7280',
      beeOpacity: 1,
      trailOpacity: headerLight ? 0.6 : 0.4,
    },
    professional: {
      doColor: headerLight ? '#FFFFFF' : '#4B5563',
      loopColor: headerLight ? '#FFFFFF' : '#6B7280',
      beeOpacity: headerLight ? 0.9 : 0.5,
      trailOpacity: headerLight ? 0.4 : 0.15,
    },
  };
  
  const config = themeConfig[theme];
  
  // Show bee based on theme and prop
  const displayBee = theme === 'professional' ? false : showBee;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Text */}
      <div className={`font-bold ${sizeConfig.text} flex items-center`}>
        <motion.span
          style={{ color: config.doColor }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          DO
        </motion.span>
        <motion.span
          style={{ color: config.loopColor }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Loop
        </motion.span>
      </div>
      
      {/* Bee Icon */}
      {displayBee && (
        <motion.div
          initial={animated ? { opacity: 0, x: -20 } : { opacity: config.beeOpacity }}
          animate={{ opacity: config.beeOpacity, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <BeeSVG
            size={sizeConfig.bee}
            animated={animated}
            theme={theme}
            trailOpacity={config.trailOpacity}
            headerLight={headerLight}
          />
        </motion.div>
      )}
    </div>
  );
}

interface BeeSVGProps {
  size: number;
  animated: boolean;
  theme: Theme;
  trailOpacity: number;
  headerLight?: boolean;
}

function BeeSVG({ size, animated, theme, trailOpacity, headerLight = false }: BeeSVGProps) {
  // New icon design: Black plus sign with yellow circular arrows
  const iconColors = {
    minimal: {
      arrows: headerLight ? '#FFFFFF' : '#FFB800',
      plus: headerLight ? '#FFFFFF' : '#000000',
    },
    playful: {
      arrows: headerLight ? '#FFFFFF' : '#FFB800',
      plus: headerLight ? '#FFFFFF' : '#000000',
    },
    professional: {
      arrows: headerLight ? '#FFFFFF' : '#FFB800',
      plus: headerLight ? '#FFFFFF' : '#4B5563',
    },
  };
  
  const colors = iconColors[theme];
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* First Arrow (top-right, going clockwise) */}
      <motion.path
        d="M 30 10 A 14 14 0 0 1 38 18 L 35 18 L 38 22 L 41 18 L 38 18 A 14 14 0 0 0 30 10 Z"
        fill={colors.arrows}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ 
          opacity: 1,
          rotate: animated ? 360 : 0,
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.2 },
          rotate: {
            duration: 4,
            repeat: animated ? Infinity : 0,
            ease: 'linear',
          },
        }}
        style={{ transformOrigin: '24px 24px' }}
      />
      
      {/* Second Arrow (bottom, going clockwise) */}
      <motion.path
        d="M 18 38 A 14 14 0 0 1 10 30 L 10 33 L 6 30 L 10 27 L 10 30 A 14 14 0 0 0 18 38 Z"
        fill={colors.arrows}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ 
          opacity: 1,
          rotate: animated ? 360 : 0,
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.4 },
          rotate: {
            duration: 4,
            repeat: animated ? Infinity : 0,
            ease: 'linear',
          },
        }}
        style={{ transformOrigin: '24px 24px' }}
      />
      
      {/* Third Arrow (left-top, going clockwise) */}
      <motion.path
        d="M 10 18 A 14 14 0 0 1 18 10 L 18 13 L 22 10 L 18 7 L 18 10 A 14 14 0 0 0 10 18 Z"
        fill={colors.arrows}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ 
          opacity: 1,
          rotate: animated ? 360 : 0,
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.6 },
          rotate: {
            duration: 4,
            repeat: animated ? Infinity : 0,
            ease: 'linear',
          },
        }}
        style={{ transformOrigin: '24px 24px' }}
      />
      
      {/* Plus Sign - Vertical Bar */}
      <motion.rect
        x="22"
        y="16"
        width="4"
        height="16"
        rx="1"
        fill={colors.plus}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        style={{ transformOrigin: '24px 24px' }}
      />
      
      {/* Plus Sign - Horizontal Bar */}
      <motion.rect
        x="16"
        y="22"
        width="16"
        height="4"
        rx="1"
        fill={colors.plus}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        style={{ transformOrigin: '24px 24px' }}
      />
    </svg>
  );
}

// Icon-only version for app icon/favicon
export function DoLoopIcon({
  size = 48,
  theme = 'playful',
  animated = false,
}: {
  size?: number;
  theme?: Theme;
  animated?: boolean;
}) {
  const themeConfig = {
    minimal: { trailOpacity: 0.3 },
    playful: { trailOpacity: 0.4 },
    professional: { trailOpacity: 0.15 },
  };
  
  return (
    <div className="inline-flex items-center justify-center">
      <BeeSVG
        size={size}
        animated={animated}
        theme={theme}
        trailOpacity={themeConfig[theme].trailOpacity}
      />
    </div>
  );
}

export default DoLoopLogo;

