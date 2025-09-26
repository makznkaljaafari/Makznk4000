
import React from 'react';

const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  'aria-label'?: string;
}> = ({ enabled, onChange, 'aria-label': ariaLabel }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`${
        enabled ? 'bg-primary' : 'bg-muted'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={`${
          enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
};

export default ToggleSwitch;
