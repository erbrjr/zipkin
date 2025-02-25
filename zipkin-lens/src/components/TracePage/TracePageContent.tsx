/*
 * Copyright 2015-2022 The OpenZipkin Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

import { Box, Drawer } from '@material-ui/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToggle } from 'react-use';
import AdjustedTrace, { AdjustedSpan } from '../../models/AdjustedTrace';
import { Header } from './Header/Header';
import {
  convertSpansToSpanTree,
  convertSpanTreeToSpanRowsAndTimestamps,
} from './helpers';
import { SpanDetailDrawer } from './SpanDetailDrawer';
import { SpanTable } from './SpanTable';
import { Timeline } from './Timeline';

const SPAN_DETAIL_DRAWER_WIDTH = '480px';

type TracePageContentProps = {
  trace: AdjustedTrace;
};

export const TracePageContent = ({ trace }: TracePageContentProps) => {
  const [rerootedSpanId, setRerootedSpanId] = useState<string>();
  const [closedSpanIdMap, setClosedSpanIdMap] = useState<{
    [spanId: string]: boolean;
  }>({});
  const [isSpanDetailDrawerOpen, toggleIsSpanDetailDrawerOpen] = useToggle(
    true,
  );
  const [isMiniTimelineOpen, toggleIsMiniTimelineOpen] = useToggle(true);
  const [isSpanTableOpen, toggleIsSpanTableOpen] = useToggle(false);

  const roots = useMemo(() => convertSpansToSpanTree(trace.spans), [
    trace.spans,
  ]);

  const { spanRows, minTimestamp, maxTimestamp } = useMemo(
    () =>
      convertSpanTreeToSpanRowsAndTimestamps(
        roots,
        closedSpanIdMap,
        rerootedSpanId,
      ),
    [closedSpanIdMap, rerootedSpanId, roots],
  );

  const toggleOpenSpan = useCallback((spanId: string) => {
    setClosedSpanIdMap((prev) => ({
      ...prev,
      [spanId]: !prev[spanId],
    }));
  }, []);

  const [selectedSpan, setSelectedSpan] = useState<AdjustedSpan>(spanRows[0]);

  const [selectedMinTimestamp, setSelectedMinTimestamp] = useState(
    minTimestamp,
  );
  const [selectedMaxTimestamp, setSelectedMaxTimestamp] = useState(
    maxTimestamp,
  );
  useEffect(() => {
    setSelectedMinTimestamp(minTimestamp);
    setSelectedMaxTimestamp(maxTimestamp);
  }, [maxTimestamp, minTimestamp]);

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 64px)">
      <Box flex="0 0">
        <Header trace={trace} toggleIsSpanTableOpen={toggleIsSpanTableOpen} />
      </Box>
      <Box flex="1 1" display="flex" overflow="hidden">
        <Box flex="1 1">
          <Timeline
            spanRows={spanRows}
            selectedSpan={selectedSpan}
            setSelectedSpan={setSelectedSpan}
            minTimestamp={minTimestamp}
            maxTimestamp={maxTimestamp}
            selectedMinTimestamp={selectedMinTimestamp}
            selectedMaxTimestamp={selectedMaxTimestamp}
            setSelectedMinTimestamp={setSelectedMinTimestamp}
            setSelectedMaxTimestamp={setSelectedMaxTimestamp}
            isSpanDetailDrawerOpen={isSpanDetailDrawerOpen}
            toggleIsSpanDetailDrawerOpen={toggleIsSpanDetailDrawerOpen}
            isMiniTimelineOpen={isMiniTimelineOpen}
            toggleIsMiniTimelineOpen={toggleIsMiniTimelineOpen}
            rerootedSpanId={rerootedSpanId}
            setRerootedSpanId={setRerootedSpanId}
            toggleOpenSpan={toggleOpenSpan}
            setClosedSpanIdMap={setClosedSpanIdMap}
          />
        </Box>
        {isSpanDetailDrawerOpen && (
          <Box
            flex={`0 0 ${SPAN_DETAIL_DRAWER_WIDTH}`}
            height="100%"
            overflow="auto"
          >
            {selectedSpan && (
              <SpanDetailDrawer
                minTimestamp={minTimestamp}
                span={selectedSpan}
              />
            )}
          </Box>
        )}
      </Box>
      <Drawer
        anchor="right"
        open={isSpanTableOpen}
        onClose={toggleIsSpanTableOpen}
      >
        <Box width="70vw" height="100vh">
          <SpanTable
            spans={trace.spans}
            setSelectedSpan={setSelectedSpan}
            toggleIsSpanTableOpen={toggleIsSpanTableOpen}
          />
        </Box>
      </Drawer>
    </Box>
  );
};
