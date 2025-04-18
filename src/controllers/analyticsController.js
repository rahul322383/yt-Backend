export const getPlaylistAnalytics = async (req, res) => {
    try {
      // Replace this with real DB logic later
      const data = {
        totalPlaylists: 10,
        totalVideos: 85,
        totalViews: 4200,
        viewsPerPlaylist: [
          { playlistName: "Frontend Mastery", views: 1000 },
          { playlistName: "Backend Basics", views: 900 },
          { playlistName: "React Deep Dive", views: 700 },
          { playlistName: "MongoDB Crash Course", views: 600 },
        ],
      };
  
      res.json(data);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Error fetching analytics" });
    }
  };
  