-- CreateTable
CREATE TABLE "CaseChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "caseManagerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseChatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "deliveredAt" DATETIME,
    "readAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_caseChatId_fkey" FOREIGN KEY ("caseChatId") REFERENCES "CaseChat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseChat_caseId_key" ON "CaseChat"("caseId");

-- CreateIndex
CREATE INDEX "CaseChat_customerId_idx" ON "CaseChat"("customerId");

-- CreateIndex
CREATE INDEX "CaseChat_caseManagerId_idx" ON "CaseChat"("caseManagerId");

-- CreateIndex
CREATE INDEX "Message_caseChatId_idx" ON "Message"("caseChatId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
