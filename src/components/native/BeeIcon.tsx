import React from 'react';
import Svg, { Path, Circle, Ellipse, Defs, Style } from 'react-native-svg';

interface BeeIconProps {
  size?: number;
}

export const BeeIcon: React.FC<BeeIconProps> = ({ size = 80 }) => {
  const scale = size / 198.06; // Original viewBox width
  
  return (
    <Svg width={size} height={size * (188.72 / 198.06)} viewBox="0 0 198.06 188.72">
      {/* Wing stinger */}
      <Path
        fill="#fcbf40"
        stroke="#010101"
        strokeWidth="0.5"
        strokeMiterlimit="10"
        d="M13.62,131.42s-3.98-1.99-10.75-7.96c-6.77-5.97,2.39,12.34,9.55,16.32s1.19-8.36,1.19-8.36Z"
      />
      
      {/* Body black stripe */}
      <Path
        fill="#010101"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M101.19,103.16s-11.41-20.1-33.44-15.52c-22.03,4.58-51.05,23.26-53.74,41.4-1.59,10.75-4.58,20.2,9.55,33.83,14.13,13.64,40.2,20.7,52.54,19.9s26.11-10.91,28.66-19.5c2.55-8.6-3.58-60.11-3.58-60.11Z"
      />
      
      {/* Wings - light blue */}
      <Path
        fill="#9ac1d6"
        stroke="#797979"
        strokeMiterlimit="10"
        d="M100.82,103.05l-8.09-8.09s-.15-32.35,11.51-41.05c11.66-8.7,38.29-24.54,49.27-23.87s23.43,8.54,24.36,20.33c.94,11.79-16.1,34.32-27.28,40.77s-47.86,18.88-47.86,18.88l-2.14-7.86"
      />
      <Path
        fill="#9ac1d6"
        stroke="#797979"
        strokeMiterlimit="10"
        d="M68.92,88.23l-6.06.45-11.43-40.45s-.43-5.77,12.46-7.85c11.09-1.79,16.2,3.47,16.2,3.47l-11.17,44.38Z"
      />
      <Path
        fill="#9ac1d6"
        stroke="#797979"
        strokeMiterlimit="10"
        d="M54.32,98.11S18.23,70.19,14.49,63.6s-10.44-19.73,4.38-32.84c14.82-13.11,26.25-10.14,29.39-7.44s10.56,9.43,13.25,36.16.9,34.59.9,34.59l-8.09,4.04Z"
      />
      <Path
        fill="#9ac1d6"
        stroke="#797979"
        strokeMiterlimit="10"
        d="M75.66,94.29s-8.37-.38-8.54-11.68c-.17-11.3,6.6-48.32,23.36-66.71C104.66.35,117.4-3.37,133.35,4.49s6.77,33.81,6.77,33.81c0,0-14.14,31.41-26.06,42.18-11.91,10.77-17.37,19.27-38.41,13.81Z"
      />
      
      {/* Antenna lines */}
      <Path
        fill="none"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M166.91,106.98c12.83-3.57,19.94-10.31,22.49-12.79"
      />
      <Path
        fill="none"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M159.77,100.53c12.83-3.57,19.94-10.31,22.49-12.79"
      />
      
      {/* Head - yellow circle */}
      <Circle fill="#fcbf40" stroke="#000" strokeWidth="3" strokeMiterlimit="10" cx="135.99" cy="136.59" r="50.63" />
      
      {/* Left eye white */}
      <Ellipse fill="#fff" stroke="#000" strokeMiterlimit="10" cx="119.85" cy="124.14" rx="20.7" ry="17.24" />
      {/* Left eye pupil */}
      <Ellipse fill="#010101" cx="125.92" cy="127.19" rx="8.78" ry="7.58" />
      
      {/* Right eye white */}
      <Ellipse fill="#fff" stroke="#000" strokeMiterlimit="10" cx="163.35" cy="125.77" rx="20.7" ry="17.24" />
      {/* Right eye pupil */}
      <Ellipse fill="#010101" cx="169.43" cy="128.82" rx="8.78" ry="7.58" />
      
      {/* Antenna balls */}
      <Circle fill="#010101" cx="178.74" cy="84.82" r="7.24" />
      <Circle fill="#010101" cx="190.82" cy="89.23" r="7.24" />
      
      {/* Smile */}
      <Path
        fill="none"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M122.68,166.45c11.64,11.1,22.83,9.38,33.44,0"
      />
      
      {/* Legs */}
      <Path
        fill="#fcbf40"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M48.65,101.96c3.18,1.59,3.18,64.48.8,66.87s-19.11-7.96-18.71-12.34,2.79-8.36,2.79-22.69-4.38-15.52-2.79-19.5,14.73-13.93,17.91-12.34Z"
      />
      <Path
        fill="#fcbf40"
        stroke="#010101"
        strokeWidth="3"
        strokeMiterlimit="10"
        d="M86.46,99.18c2.39,5.17-6.42,17.76-6.77,36.22s6.97,28.75,9.95,36.22c.4,4.78-20.3,7.56-22.69,3.18s-4.97-50.52-4.38-37.02c.59,13.5-.96-38.4,4.38-41.4s15.92.4,19.5,2.79Z"
      />
    </Svg>
  );
};

