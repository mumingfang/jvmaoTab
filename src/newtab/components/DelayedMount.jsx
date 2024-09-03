import React from 'react';

export default function DelayedMount({ delay = 250, children }) {
  const [isShowing, setShowing] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => setShowing(true), delay);
    return () => {
      clearTimeout(timeout);
    };
  }, [delay]);

  if (!isShowing) {
    return null;
  }

  return children;
}

