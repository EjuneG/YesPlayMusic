<template>
  <div class="track-list">
    <ContextMenu ref="menu" @close-menu="closeMenu">
      <template v-if="hasSelection">
        <div class="item-info">
          <div class="info">
            <div class="title">{{ $t('contextMenu.selectedNSongs', { n: selectedIndexes.length }) }}</div>
          </div>
        </div>
        <hr />
        <div class="item" @click="addSelectionToQueue">{{
          $t('contextMenu.addToQueue')
        }}</div>
        <div
          v-show="type !== 'cloudDisk'"
          class="item"
          @click="addSelectionToPlaylist"
          >{{ $t('contextMenu.addToPlaylist') }}</div
        >
        <div
          v-if="extraContextMenuItem.includes('removeTrackFromPlaylist')"
          class="item"
          @click="removeSelectionFromPlaylist"
          >{{ $t('contextMenu.removeFromPlaylist') }}</div
        >
        <hr />
        <div class="item" @click="clearSelection">{{ $t('contextMenu.clearSelection') }}</div>
      </template>
      <template v-else>
        <div v-show="type !== 'cloudDisk'" class="item-info">
          <img
            :src="resizeImage(rightClickedTrackComputed.al.picUrl, 224)"
            loading="lazy"
          />
          <div class="info">
            <div class="title">{{ rightClickedTrackComputed.name }}</div>
            <div class="subtitle">{{
              rightClickedTrackComputed.ar[0].name
            }}</div>
          </div>
        </div>
        <hr v-show="type !== 'cloudDisk'" />
        <div class="item" @click="play">{{ $t('contextMenu.play') }}</div>
        <div class="item" @click="addToQueue">{{
          $t('contextMenu.addToQueue')
        }}</div>
        <div
          v-if="extraContextMenuItem.includes('removeTrackFromQueue')"
          class="item"
          @click="removeTrackFromQueue"
          >从队列删除</div
        >
        <hr v-show="type !== 'cloudDisk'" />
        <div
          v-show="!isRightClickedTrackLiked && type !== 'cloudDisk'"
          class="item"
          @click="like"
        >
          {{ $t('contextMenu.saveToMyLikedSongs') }}
        </div>
        <div
          v-show="isRightClickedTrackLiked && type !== 'cloudDisk'"
          class="item"
          @click="like"
        >
          {{ $t('contextMenu.removeFromMyLikedSongs') }}
        </div>
        <div
          v-if="extraContextMenuItem.includes('removeTrackFromPlaylist')"
          class="item"
          @click="removeTrackFromPlaylist"
          >从歌单中删除</div
        >
        <div
          v-show="type !== 'cloudDisk'"
          class="item"
          @click="addTrackToPlaylist"
          >{{ $t('contextMenu.addToPlaylist') }}</div
        >
        <div v-show="type !== 'cloudDisk'" class="item" @click="copyLink">{{
          $t('contextMenu.copyUrl')
        }}</div>
        <div
          v-if="extraContextMenuItem.includes('removeTrackFromCloudDisk')"
          class="item"
          @click="removeTrackFromCloudDisk"
          >从云盘中删除</div
        >
      </template>
    </ContextMenu>

    <div :style="listStyles">
      <TrackListItem
        v-for="(track, index) in tracks"
        :key="itemKey === 'id' ? track.id : `${track.id}${index}`"
        :track-prop="track"
        :track-no="index + 1"
        :highlight-playing-track="highlightPlayingTrack"
        :selected="selectedIndexes.includes(index)"
        :type="type"
        :album-object="albumObject"
        :right-clicked-track-id="rightClickedTrack.id"
        @play-this-list="playThisList"
        @like-a-track="likeATrack"
        @dblclick="playThisList(track.id || track.songId)"
        @click="handleClick($event, index)"
        @click.right="openMenu($event, track, index)"
      />
    </div>

    <transition name="slide-up">
      <div v-if="showSelectionBar" class="selection-bar">
        <span class="selection-count">{{
          $t('contextMenu.selectedNSongs', { n: selectedIndexes.length })
        }}</span>
        <button @click="addSelectionToQueue">{{ $t('contextMenu.addToQueue') }}</button>
        <button v-show="type !== 'cloudDisk'" @click="addSelectionToPlaylist">{{
          $t('contextMenu.addToPlaylist')
        }}</button>
        <button
          v-if="extraContextMenuItem.includes('removeTrackFromPlaylist')"
          @click="removeSelectionFromPlaylist"
          >{{ $t('contextMenu.removeFromPlaylist') }}</button
        >
        <button class="cancel" @click="clearSelection">{{ $t('contextMenu.clearSelection') }}</button>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { addOrRemoveTrackFromPlaylist } from '@/api/playlist';
import { cloudDiskTrackDelete } from '@/api/user';
import { isAccountLoggedIn } from '@/utils/auth';
import { resizeImage } from '@/utils/filters';

import TrackListItem from '@/components/TrackListItem.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import locale from '@/locale';

export default {
  name: 'TrackList',
  components: {
    TrackListItem,
    ContextMenu,
  },
  props: {
    tracks: {
      type: Array,
      default: () => {
        return [];
      },
    },
    type: {
      type: String,
      default: 'tracklist',
    }, // tracklist | album | playlist | cloudDisk
    id: {
      type: Number,
      default: 0,
    },
    dbclickTrackFunc: {
      type: String,
      default: 'default',
    },
    albumObject: {
      type: Object,
      default: () => {
        return {
          artist: {
            name: '',
          },
        };
      },
    },
    extraContextMenuItem: {
      type: Array,
      default: () => {
        return [];
      },
    },
    columnNumber: {
      type: Number,
      default: 4,
    },
    highlightPlayingTrack: {
      type: Boolean,
      default: true,
    },
    itemKey: {
      type: String,
      default: 'id',
    },
  },
  data() {
    return {
      rightClickedTrack: {
        id: 0,
        name: '',
        ar: [{ name: '' }],
        al: { picUrl: '' },
      },
      rightClickedTrackIndex: -1,
      selectedIndexes: [],
      lastClickedIndex: -1,
      listStyles: {},
    };
  },
  computed: {
    ...mapState(['liked', 'player']),
    hasSelection() {
      return this.selectedIndexes.length > 1;
    },
    showSelectionBar() {
      const allowedRoutes = ['playlist', 'album', 'likedSongs', 'dailySongs'];
      return this.hasSelection && allowedRoutes.includes(this.$route.name);
    },
    selectedTracks() {
      return this.selectedIndexes.map(i => this.tracks[i]).filter(Boolean);
    },
    isRightClickedTrackLiked() {
      return this.liked.songs.includes(this.rightClickedTrack?.id);
    },
    rightClickedTrackComputed() {
      return this.type === 'cloudDisk'
        ? {
            id: 0,
            name: '',
            ar: [{ name: '' }],
            al: { picUrl: '' },
          }
        : this.rightClickedTrack;
    },
  },
  created() {
    if (this.type === 'tracklist') {
      this.listStyles = {
        display: 'grid',
        gap: '4px',
        gridTemplateColumns: `repeat(${this.columnNumber}, 1fr)`,
      };
    }
    document.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    ...mapMutations(['updateModal']),
    ...mapActions(['nextTrack', 'showToast', 'likeATrack']),
    resizeImage,
    // --- 键盘快捷键 ---
    handleKeydown(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape' && this.hasSelection) {
        this.clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && this.tracks.length) {
        e.preventDefault();
        this.selectedIndexes = this.tracks.map((_, i) => i);
      }
    },
    // --- 选择逻辑 ---
    handleClick(e, index) {
      if (e.shiftKey) {
        // Shift+click: 从锚点到当前的范围替换选中（不追加）
        e.preventDefault();
        const anchor =
          this.lastClickedIndex !== -1 ? this.lastClickedIndex : index;
        const start = Math.min(anchor, index);
        const end = Math.max(anchor, index);
        const range = [];
        for (let i = start; i <= end; i++) {
          range.push(i);
        }
        this.selectedIndexes = range;
        // 不更新 lastClickedIndex，锚点保持不变
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl+click: 切换单个
        const pos = this.selectedIndexes.indexOf(index);
        if (pos === -1) {
          this.selectedIndexes.push(index);
        } else {
          this.selectedIndexes.splice(pos, 1);
        }
        this.lastClickedIndex = index;
      } else {
        // 普通点击: 选中当前这一首，清除其他
        this.selectedIndexes = [index];
        this.lastClickedIndex = index;
      }
    },
    clearSelection() {
      this.selectedIndexes = [];
      this.lastClickedIndex = -1;
    },
    // --- 右键菜单 ---
    openMenu(e, track, index = -1) {
      if (this.hasSelection && !this.selectedIndexes.includes(index)) {
        this.clearSelection();
      }
      this.rightClickedTrack = track;
      this.rightClickedTrackIndex = index;
      this.$refs.menu.openMenu(e);
    },
    closeMenu() {
      this.rightClickedTrack = {
        id: 0,
        name: '',
        ar: [{ name: '' }],
        al: { picUrl: '' },
      };
      this.rightClickedTrackIndex = -1;
    },
    // --- 播放 ---
    playThisList(trackID) {
      if (this.dbclickTrackFunc === 'default') {
        this.playThisListDefault(trackID);
      } else if (this.dbclickTrackFunc === 'none') {
        // do nothing
      } else if (this.dbclickTrackFunc === 'playTrackOnListByID') {
        this.player.playTrackOnListByID(trackID);
      } else if (this.dbclickTrackFunc === 'playPlaylistByID') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.dbclickTrackFunc === 'playAList') {
        let trackIDs = this.tracks.map(t => t.id || t.songId);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      } else if (this.dbclickTrackFunc === 'dailyTracks') {
        let trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, '/daily/songs', 'url', trackID);
      } else if (this.dbclickTrackFunc === 'playCloudDisk') {
        let trackIDs = this.tracks.map(t => t.id || t.songId);
        this.player.replacePlaylist(trackIDs, this.id, 'cloudDisk', trackID);
      }
    },
    playThisListDefault(trackID) {
      if (this.type === 'playlist') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.type === 'album') {
        this.player.playAlbumByID(this.id, trackID);
      } else if (this.type === 'tracklist') {
        let trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      }
    },
    // --- 单曲操作 ---
    play() {
      this.player.addTrackToPlayNext(this.rightClickedTrack.id, true);
    },
    addToQueue() {
      this.player.addTrackToPlayNext(this.rightClickedTrack.id);
    },
    like() {
      this.likeATrack(this.rightClickedTrack.id);
    },
    addTrackToPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: this.rightClickedTrack.id,
      });
    },
    removeTrackFromPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      if (confirm(`确定要从歌单删除 ${this.rightClickedTrack.name}？`)) {
        let trackID = this.rightClickedTrack.id;
        addOrRemoveTrackFromPlaylist({
          op: 'del',
          pid: this.id,
          tracks: trackID,
        }).then(data => {
          this.showToast(
            data.body.code === 200
              ? locale.t('toast.removedFromPlaylist')
              : data.body.message
          );
          this.$emit('remove-track', trackID);
        });
      }
    },
    copyLink() {
      navigator.clipboard
        .writeText(
          `https://music.163.com/song?id=${this.rightClickedTrack.id}`
        )
        .then(() => {
          this.showToast(locale.t('toast.copied'));
        })
        .catch(err => {
          this.showToast(`${locale.t('toast.copyFailed')}${err}`);
        });
    },
    removeTrackFromQueue() {
      this.$store.state.player.removeTrackFromQueue(
        this.rightClickedTrackIndex
      );
    },
    // --- 批量操作 ---
    addSelectionToQueue() {
      this.selectedTracks.forEach(t => {
        this.player.addTrackToPlayNext(t.id || t.songId);
      });
      this.showToast(`已将 ${this.selectedTracks.length} 首歌曲添加到队列`);
      this.clearSelection();
    },
    addSelectionToPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      const trackIDs = this.selectedTracks.map(t => t.id || t.songId).join(',');
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: trackIDs,
      });
      this.clearSelection();
    },
    removeSelectionFromPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      const count = this.selectedTracks.length;
      if (confirm(`确定要从歌单删除 ${count} 首歌曲？`)) {
        const trackIDs = this.selectedTracks.map(t => t.id).join(',');
        addOrRemoveTrackFromPlaylist({
          op: 'del',
          pid: this.id,
          tracks: trackIDs,
        }).then(data => {
          this.showToast(
            data.body.code === 200
              ? locale.t('toast.removedFromPlaylist')
              : data.body.message
          );
          const trackIDs = this.selectedTracks.map(t => t.id);
          this.$emit('remove-tracks', trackIDs);
          this.clearSelection();
        });
      }
    },
    removeTrackFromCloudDisk() {
      if (confirm(`确定要从云盘删除 ${this.rightClickedTrack.songName}？`)) {
        let trackID = this.rightClickedTrack.songId;
        cloudDiskTrackDelete(trackID).then(data => {
          this.showToast(
            data.code === 200 ? '已将此歌曲从云盘删除' : data.message
          );
          let newCloudDisk = this.liked.cloudDisk.filter(
            t => t.songId !== trackID
          );
          this.$store.commit('updateLikedXXX', {
            name: 'cloudDisk',
            data: newCloudDisk,
          });
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.track-list {
  position: relative;
}

.selection-bar {
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: var(--color-secondary-bg);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  user-select: none;

  .selection-count {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin-right: 4px;
    white-space: nowrap;
  }

  button {
    font-size: 13px;
    font-weight: 500;
    padding: 6px 16px;
    border-radius: 8px;
    color: var(--color-text);
    background: var(--color-primary-bg-for-transparent);
    transition: 0.2s;
    white-space: nowrap;
    &:hover {
      background: var(--color-primary);
      color: white;
    }
  }

  button.cancel {
    background: transparent;
    opacity: 0.68;
    &:hover {
      opacity: 1;
      background: var(--color-secondary-bg-for-transparent);
      color: var(--color-text);
    }
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}
</style>
