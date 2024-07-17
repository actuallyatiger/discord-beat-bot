const youtube = require("@googleapis/youtube");
const moment = require("moment");

require("dotenv").config();

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: "YouTubeAPI" },
  transports: [
    new DailyRotateFile({
      filename: "logs/yt/%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxFiles: "14d",
      maxSize: "20m",
    }),
    new winston.transports.Console(),
  ],
});

class YouTubeAPI {
  constructor() {
    this.client = youtube.youtube({
      version: "v3",
      auth: process.env.API_KEY,
    });
  }

  async search(query, token) {
    try {
      const res = await this.client.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        eventType: "none",
        maxResults: 5,
        pageToken: token || undefined,
      });

      if (res.data.error) {
        logger.error(`Response error: ${res.data.error}`);
        return null;
      }

      return {
        nextPage: res.data.nextPageToken,
        items: res.data.items.map((item) => {
          return {
            title: item.snippet.title,
            id: item.id.videoId,
            thumbnail: item.snippet.thumbnails.default.url,
          };
        }),
      };
    } catch (error) {
      logger.error(`Caught error: ${error} `);
      return null;
    }
  }

  async getVideoInfo(video_id) {
    try {
      const res = await this.client.videos.list({
        part: ["snippet", "contentDetails"],
        id: video_id,
      });

      if (res.data.error) {
        logger.error(`Response error: ${res.data.error}`);
        return null;
      }

      return {
        title: res.data.items[0].snippet.title,
        duration: moment.duration(res.data.items[0].contentDetails.duration).asSeconds(),
        thumbnail: res.data.items[0].snippet.thumbnails.default,
      };
    } catch (error) {
      logger.error(`Caught error: ${error} `);
      return null;
    }
  }

  async getPlaylistInfo(playlist_id) {
    try {
      const playlist = { items: [] };

      let i = 0;
      let isNextPage = true;
      let nextPageToken = undefined;

      while (i < 5 && isNextPage) {
        const res = await this.client.playlistItems.list({
          part: ["snippet"],
          playlistId: playlist_id,
          maxResults: 50,
          pageToken: nextPageToken,
        });

        if (res.data.error) {
          logger.error(`Response error: ${res.data.error}`);
          return null;
        }

        res.data.items.map((item) => {
          playlist.items.push({
            title: item.snippet.title,
            id: item.snippet.resourceId.videoId,
            thumbnail: item.snippet.thumbnails.default.url,
          });
        });

        nextPageToken = res.data.nextPageToken;
        isNextPage = nextPageToken !== undefined;
        i++;
      }

      return playlist;
    } catch (error) {
      logger.error(`Caught error: ${error} `);
      return null;
    }
  }
}

module.exports = { ytapi: new YouTubeAPI() };
