-module(gateway_compress).

-export([
    new_context/1,
    compress/2,
    decompress/2,
    parse_compression/1,
    close_context/1,
    get_type/1
]).

-type compression() :: none | zstd_stream.
-opaque compress_ctx() :: #{type := compression()}.
-export_type([compression/0, compress_ctx/0]).

-spec parse_compression(binary() | undefined) -> compression().
parse_compression(_) -> none.

-spec new_context(compression()) -> compress_ctx().
new_context(_) -> #{type => none}.

-spec close_context(compress_ctx()) -> ok.
close_context(#{}) -> ok.

-spec get_type(compress_ctx()) -> compression().
get_type(#{type := Type}) -> Type.

-spec compress(iodata(), compress_ctx()) -> {ok, binary(), compress_ctx()} | {error, term()}.
compress(Data, Ctx) -> {ok, iolist_to_binary(Data), Ctx}.

-spec decompress(binary(), compress_ctx()) -> {ok, binary(), compress_ctx()} | {error, term()}.
decompress(Data, Ctx) -> {ok, Data, Ctx}.
