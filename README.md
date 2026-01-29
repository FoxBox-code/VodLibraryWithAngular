## This is a full stack web application , insipired by Youtube . It target was to put me on a path of learning how to do real projects and leave behind the toy puzzles.


## Key Features

Video Playback:
  - Custom HTML5 video player
  - Multiple video renditions (resolution switching during playback)
  - Playback speed control
  - Keyboard shortcuts (play/pause, seek, fullscreen, mute)
  - Fullscreen support
  - Sprite-sheet based hover frame previews on the progress bar

Comments & Replies::
  - Comment system with nested replies
  - Infinite scroll / lazy loading using IntersectionObserver
  - Like / dislike reactions on both comments and replies
  - Client-side state managed with RxJS BehaviorSubjects
  - Sorting (newest / most popular)

Reactions & Engagement:
	-  Video like / dislike system
  -  Comment and reply reactions
  -  View counting based on watch time threshold
  -  Subscription system (follow/unfollow creators)

Video Metadata
  -  Expandable descriptions
  -  Clickable timestamps inside descriptions (jump to video time)

Playlists & History
  - User watch history
  - Liked videos playlist
  - Sequential playback inside playlists

## Tech Stack
Frontend::
  -  Angular (TypeScript)
  -  RxJS for reactive state management
  -  SCSS for styling

Backend
  -  ASP.NET Core
  -  Entity Framework Core
  -  RESTful APIs
  -  JWT authentication
  -  PostgreSQL database

## Architectural Highlights
  Clear separation between::
    -  Components
    -  Services
    -  DTOs / Models

  Extensive use of RxJS streams for UI reactivity
  Client-side caching using sessionStorage
  Pagination & lazy loading for performance
  Defensive handling of unauthenticated users

  Current Status

 Core functionality implemented

 Feature-complete for learning goals

 Not deployed publicly (yet)

This repository is intended primarily as a code showcase, not a production deployment.
