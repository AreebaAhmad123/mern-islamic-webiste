import React from 'react';

const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">About Islamic Stories</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-4">
          Welcome to Islamic Stories, a platform dedicated to sharing inspiring stories from Islamic tradition, 
          contemporary Muslim experiences, and spiritual insights that connect us to our faith and community.
        </p>
        
        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Our Mission</h2>
        <p className="text-gray-600 mb-4">
          Our mission is to provide a space where Muslims and those interested in Islamic culture can discover, 
          share, and engage with meaningful stories that reflect the beauty and wisdom of Islamic teachings.
        </p>
        
        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">What We Offer</h2>
        <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
          <li>Authentic Islamic stories and narratives</li>
          <li>Contemporary Muslim experiences and reflections</li>
          <li>Educational content about Islamic history and culture</li>
          <li>A community platform for sharing and discussion</li>
        </ul>
        
        <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Join Our Community</h2>
        <p className="text-gray-600 mb-4">
          Whether you're looking to learn, share, or simply explore Islamic stories, we invite you to join our 
          growing community. Together, we can create a space that celebrates the rich tapestry of Islamic 
          culture and spirituality.
        </p>
      </div>
    </div>
  );
};

export default AboutPage; 