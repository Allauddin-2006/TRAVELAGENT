import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Map from './components/Map';
import Chat from './components/Chat';
import TripDashboard from './components/TripDashboard';
import { TripPlan } from './types';
import { LayoutDashboard, MessageSquare, Users, Map as MapIcon } from 'lucide-react';
import { auth, db, signIn, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tripId, setTripId] = useState<string>('');
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([
    {
      role: 'assistant',
      content: 'Hello! I am TravelGPT. I can help you plan your entire trip. To get started, please tell me your travel destination, your budget, the dates of your trip, if you are traveling solo or with a group, and any specific vibes or interests you have for this trip!'
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'map'>('chat');
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);

  const [leftWidth, setLeftWidth] = useState(500);
  const isDragging = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = Math.max(300, Math.min(e.clientX, window.innerWidth - 300));
    setLeftWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [handleMouseMove, handleMouseUp]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsInitializing(false);
      } else {
        await signIn();
      }
    });
    return () => unsubscribe();
  }, []);

  // Trip Initialization and Listener
  useEffect(() => {
    if (isInitializing || !user) return;

    const params = new URLSearchParams(window.location.search);
    let currentTripId = params.get('tripId');
    
    if (!currentTripId) {
      currentTripId = uuidv4();
      window.history.replaceState({}, '', `?tripId=${currentTripId}`);
    }
    setTripId(currentTripId);

    const tripRef = doc(db, 'trips', currentTripId);

    const initializeTrip = async () => {
      try {
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists()) {
          // Create new trip
          await setDoc(tripRef, {
            ownerId: user.uid,
            messages: messages,
            tripPlan: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `trips/${currentTripId}`);
      }
    };

    initializeTrip();

    // Listen for real-time updates
    const unsubscribe = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        if (data.tripPlan) {
          setTripPlan(data.tripPlan);
        }
        // Assuming anyone modifying the document is a connected user
        setConnectedUsers(data.collaboratorIds?.length || 1);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `trips/${currentTripId}`);
    });

    return () => unsubscribe();
  }, [user, isInitializing]);

  const saveToFirestore = async (newMessages: any[], newTripPlan: TripPlan | null) => {
    if (!user || !tripId) return;
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        messages: newMessages,
        tripPlan: newTripPlan,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to sync to Firestore:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    const newMessages = [...messages, { role: 'user' as const, content }];
    setMessages(newMessages); // Optimistic update
    setIsChatLoading(true);
    await saveToFirestore(newMessages, tripPlan);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, tripContext: tripPlan })
      });
      const data = await response.json();
      
      if (data.success) {
        const updatedMessages = [...newMessages, { role: 'assistant' as const, content: data.text }];
        setMessages(updatedMessages); // Optimistic update
        await saveToFirestore(updatedMessages, tripPlan);
      } else {
        alert(data.error || 'Failed to get a response. Please try again.');
        // Revert optimistic update
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error. Please try again.');
      setMessages(messages);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateItinerary = async () => {
    setIsGeneratingTrip(true);
    setActiveTab('dashboard'); 

    try {
      const promptContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `Based on the following conversation, generate a complete travel itinerary:\n\n${promptContext}`;

      const response = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentTrip: tripPlan })
      });
      
      const data = await response.json();
      if (data.success) {
        setTripPlan(data.trip); // Optimistic update
        await saveToFirestore(messages, data.trip);
      } else {
        alert(data.error || 'Failed to generate trip. Please try again.');
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      alert('An error occurred while generating the itinerary. Please try again.');
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Invite link copied to clipboard!');
  };

  if (isInitializing || !user) {
    return <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-400">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-950 font-sans overflow-hidden text-gray-100 flex-col md:flex-row">
      {/* Mobile Tabs */}
      <div className="md:hidden flex border-b border-gray-800 bg-gray-900 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        >
          <MessageSquare className="w-4 h-4" />
          Plan
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'dashboard' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Trip
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'map' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        >
          <MapIcon className="w-4 h-4" />
          Map
        </button>
      </div>

      {/* Left Panel - Chat & Dashboard */}
      <div 
        className={`w-full md:w-auto relative flex-col bg-gray-900 shadow-xl z-10 border-r border-gray-800 ${activeTab === 'map' ? 'hidden md:flex' : 'flex flex-1 md:flex-none'}`}
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? leftWidth : '100%' }}
      >
        {/* Desktop Header Tabs */}
        <div className="hidden md:flex border-b border-gray-800 shrink-0">
          <button
            onClick={() => { setActiveTab('chat'); }}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'chat' || activeTab === 'map' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Planner
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === 'dashboard' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Itinerary
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'chat' || activeTab === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <Chat 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isChatLoading}
              onGenerateItinerary={handleGenerateItinerary}
              isGeneratingItinerary={isGeneratingTrip}
            />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            {isGeneratingTrip ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-900">
                <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-medium text-gray-100 mb-2">Crafting your perfect trip...</h3>
                <p className="text-gray-400 max-w-xs">TravelGPT is analyzing destinations, routing maps, and finding the best spots.</p>
              </div>
            ) : (
              <TripDashboard trip={tripPlan} />
            )}
          </div>
        </div>

        {/* Desktop Resizer Handle */}
        <div 
          className="hidden md:block absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors z-50 translate-x-1/2"
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Right Panel - Map */}
      <div className={`flex-1 relative ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
        {/* Top bar over map */}
        <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between pointer-events-none">
          <div className="pointer-events-auto">
             {/* We can put map controls here */}
          </div>
          
          {/* Collaboration Badge & User Profile */}
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg px-2 py-1 flex items-center gap-3 pointer-events-auto border border-gray-700">
            <div className="pl-3 pr-1 py-1 flex items-center gap-2 text-sm font-medium text-gray-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <Users className="w-4 h-4 text-gray-400" />
              <span className="hidden sm:inline">{connectedUsers} {connectedUsers === 1 ? 'Planner' : 'Planners'}</span>
              <span className="sm:hidden">{connectedUsers}</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <button 
              onClick={copyInviteLink}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium px-2 cursor-pointer transition-colors"
            >
              Invite
            </button>
          </div>
        </div>

        <Map trip={tripPlan} />
      </div>
    </div>
  );
}

