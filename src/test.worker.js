// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  // Send a message back to the main thread
  self.postMessage(event.data);
});
