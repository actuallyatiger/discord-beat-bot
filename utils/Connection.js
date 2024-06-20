const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require("@discordjs/voice");
const ytdl = require("ytdl-core");

const ytdl_options = { filter: "audioonly", quality: "highestaudio", liveBuffer: 2000, highWaterMark: 1 << 25 };

module.exports = class Connection {
  constructor(channel_id, guild_id, interaction) {
    this.channel_id = channel_id;
    this.guild_id = guild_id;

    this.connection = joinVoiceChannel({
      channelId: this.channel_id,
      guildId: this.guild_id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    this.audioPlayer = createAudioPlayer();
    this.connection.subscribe(this.audioPlayer);
  }

  play(url) {
    const stream = ytdl(url, ytdl_options);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    this.audioPlayer.play(resource);
  }

  becomeIdle() {
    this.audioPlayer.stop(true);
  }

  destroy() {
    this.becomeIdle();
    this.connection.destroy();
  }
};
