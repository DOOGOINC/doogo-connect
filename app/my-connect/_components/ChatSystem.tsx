"use client";

import { ChatMessagePanel } from "./chat/ChatMessagePanel";
import { ChatRoomMemoPanel } from "./chat/ChatRoomMemoPanel";
import { ChatRoomSidebar } from "./chat/ChatRoomSidebar";
import { useChatSystemController } from "./chat/useChatSystemController";
import type { ViewMode } from "./chat/types";

export function ChatSystem({
  userId,
  viewMode,
  initialRoomId = "",
}: {
  userId: string;
  viewMode: ViewMode;
  initialRoomId?: string;
}) {
  const {
    CHAT_FILE_ACCEPT,
    deleteRoomMemo,
    fileInputRef,
    filteredRooms,
    handleFileSelect,
    hasOlderMessages,
    isLoadingOlderMessages,
    isSending,
    isUploading,
    loadOlderMessages,
    memoMap,
    messageInput,
    messageListRef,
    messages,
    messagesEndRef,
    onFileClick,
    onInputChange,
    onRoomSelect,
    roomFilter,
    saveRoomMemo,
    searchQuery,
    selectedRoom,
    selectedRoomId,
    sendCurrentMessage,
    setRoomFilter,
    setSearchQuery,
  } = useChatSystemController({
    userId,
    viewMode,
    initialRoomId,
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[#F8F9FA]">
      <input ref={fileInputRef} type="file" hidden accept={CHAT_FILE_ACCEPT} onChange={handleFileSelect} />

      <ChatRoomSidebar
        rooms={filteredRooms}
        roomFilter={roomFilter}
        searchQuery={searchQuery}
        selectedRoomId={selectedRoomId}
        memoMap={memoMap}
        onMemoOpen={onRoomSelect}
        onFilterChange={setRoomFilter}
        onSearchChange={setSearchQuery}
        onRoomSelect={onRoomSelect}
      />

      <ChatMessagePanel
        selectedRoom={selectedRoom}
        messages={messages}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        messageInput={messageInput}
        isSending={isSending}
        isUploading={isUploading}
        messageListRef={messageListRef}
        messagesEndRef={messagesEndRef}
        onInputChange={onInputChange}
        onSend={sendCurrentMessage}
        onFileClick={onFileClick}
        onLoadOlderMessages={() => void loadOlderMessages()}
      />

      <ChatRoomMemoPanel
        room={selectedRoom}
        memoItem={selectedRoom ? memoMap[selectedRoom.id] || null : null}
        onSave={saveRoomMemo}
        onDelete={deleteRoomMemo}
      />
    </div>
  );
}
